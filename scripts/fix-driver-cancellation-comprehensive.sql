-- Fix driver cancellation with comprehensive error handling
CREATE OR REPLACE FUNCTION move_ride_back_to_requests(
    p_ride_id UUID,
    p_cancellation_reason TEXT DEFAULT 'Cancelled by driver'
) RETURNS JSON AS $$
DECLARE
    v_ride_record RECORD;
    v_result JSON;
BEGIN
    -- First, check if the ride exists in the rides table
    SELECT * INTO v_ride_record
    FROM rides 
    WHERE id = p_ride_id;
    
    -- If ride not found, return error
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Ride not found with ID: ' || p_ride_id,
            'ride_id', p_ride_id
        );
    END IF;
    
    -- Check if ride is in a cancellable state
    IF v_ride_record.status NOT IN ('scheduled', 'in_progress') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Ride cannot be cancelled with status: ' || v_ride_record.status,
            'current_status', v_ride_record.status,
            'ride_id', p_ride_id
        );
    END IF;
    
    -- Check if ride request already exists (to prevent duplicates)
    IF EXISTS (
        SELECT 1 FROM ride_requests 
        WHERE parent_id = v_ride_record.parent_id 
        AND child_id = v_ride_record.child_id
        AND origin_lat = v_ride_record.origin_lat
        AND origin_lng = v_ride_record.origin_lng
        AND destination_lat = v_ride_record.destination_lat
        AND destination_lng = v_ride_record.destination_lng
        AND scheduled_time = v_ride_record.scheduled_time
        AND status = 'pending'
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Ride request already exists in pending state',
            'ride_id', p_ride_id
        );
    END IF;
    
    -- Insert back into ride_requests table
    INSERT INTO ride_requests (
        parent_id,
        child_id,
        origin_lat,
        origin_lng,
        origin_address,
        destination_lat,
        destination_lng,
        destination_address,
        destination_name,
        scheduled_time,
        estimated_fare,
        status,
        notes,
        created_at,
        updated_at
    ) VALUES (
        v_ride_record.parent_id,
        v_ride_record.child_id,
        v_ride_record.origin_lat,
        v_ride_record.origin_lng,
        v_ride_record.origin_address,
        v_ride_record.destination_lat,
        v_ride_record.destination_lng,
        v_ride_record.destination_address,
        v_ride_record.destination_name,
        v_ride_record.scheduled_time,
        v_ride_record.fare,
        'pending',
        'Re-posted after driver cancellation: ' || p_cancellation_reason,
        NOW(),
        NOW()
    );
    
    -- Apply 10% fine to driver's wallet
    UPDATE users 
    SET wallet_balance = wallet_balance - (v_ride_record.fare * 0.10)
    WHERE id = v_ride_record.driver_id;
    
    -- Create transaction record for the fine
    INSERT INTO transactions (user_id, amount, type, description, ride_id, created_at)
    VALUES (
        v_ride_record.driver_id,
        (v_ride_record.fare * 0.10),
        'debit',
        'Cancellation fine (10%): ' || p_cancellation_reason,
        p_ride_id,
        NOW()
    );
    
    -- Delete from rides table
    DELETE FROM rides WHERE id = p_ride_id;
    
    -- Create notification for parent
    INSERT INTO notifications (user_id, title, content, type, ride_id, created_at)
    VALUES (
        v_ride_record.parent_id,
        'Ride Cancelled by Driver',
        'Your ride has been cancelled by the driver and is now available for other drivers to accept. Reason: ' || p_cancellation_reason,
        'ride_cancelled',
        p_ride_id,
        NOW()
    );
    
    -- Notify all online drivers about the new available ride request
    INSERT INTO notifications (user_id, title, content, type, created_at)
    SELECT 
        id,
        'New Ride Request Available',
        'A ride request is now available after driver cancellation.',
        'ride_request_available',
        NOW()
    FROM users 
    WHERE user_type = 'driver' 
    AND is_online = true 
    AND id != v_ride_record.driver_id;
    
    -- Archive messages related to this ride
    UPDATE messages 
    SET archived = true, archived_at = NOW()
    WHERE ride_id = p_ride_id;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Ride moved back to requests successfully',
        'ride_id', p_ride_id,
        'fine_applied', (v_ride_record.fare * 0.10)
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Database error: ' || SQLERRM,
            'ride_id', p_ride_id
        );
END;
$$ LANGUAGE plpgsql;
