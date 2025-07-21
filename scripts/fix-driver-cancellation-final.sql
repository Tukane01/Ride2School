-- Final comprehensive fix for driver cancellation
CREATE OR REPLACE FUNCTION move_ride_back_to_requests(
    p_ride_id UUID,
    p_cancellation_reason TEXT DEFAULT 'Cancelled by driver'
) RETURNS JSON AS $$
DECLARE
    v_ride_record RECORD;
    v_result JSON;
    v_error_msg TEXT;
    v_fine_amount DECIMAL;
BEGIN
    -- Log the attempt
    RAISE NOTICE 'Attempting to cancel ride: %', p_ride_id;
    
    -- First, check if the ride exists in the rides table
    SELECT * INTO v_ride_record
    FROM rides 
    WHERE id = p_ride_id;
    
    -- If ride not found, check other tables
    IF NOT FOUND THEN
        -- Check if ride is already completed
        IF EXISTS (SELECT 1 FROM completed_rides WHERE original_ride_id = p_ride_id) THEN
            v_error_msg := 'Cannot cancel ride - it has already been completed';
            RAISE WARNING '%', v_error_msg;
            RETURN json_build_object(
                'success', false,
                'error', v_error_msg,
                'ride_id', p_ride_id
            );
        END IF;
        
        -- Check if ride is already cancelled
        IF EXISTS (SELECT 1 FROM cancelled_rides WHERE original_ride_id = p_ride_id) THEN
            v_error_msg := 'Cannot cancel ride - it has already been cancelled';
            RAISE WARNING '%', v_error_msg;
            RETURN json_build_object(
                'success', false,
                'error', v_error_msg,
                'ride_id', p_ride_id
            );
        END IF;
        
        -- Ride doesn't exist anywhere
        v_error_msg := 'Ride not found with ID: ' || p_ride_id;
        RAISE WARNING '%', v_error_msg;
        RETURN json_build_object(
            'success', false,
            'error', v_error_msg,
            'ride_id', p_ride_id
        );
    END IF;
    
    -- Log ride details
    RAISE NOTICE 'Found ride: % with status: %', p_ride_id, v_ride_record.status;
    
    -- Check if ride is in a cancellable state
    IF v_ride_record.status NOT IN ('scheduled', 'in_progress') THEN
        v_error_msg := 'Ride cannot be cancelled with status: ' || v_ride_record.status;
        RAISE WARNING '%', v_error_msg;
        RETURN json_build_object(
            'success', false,
            'error', v_error_msg,
            'current_status', v_ride_record.status,
            'ride_id', p_ride_id
        );
    END IF;
    
    -- Calculate fine (10% of fare)
    v_fine_amount := COALESCE(v_ride_record.fare * 0.10, 0);
    
    -- Begin transaction for cancellation
    BEGIN
        -- Check if ride request already exists (to prevent duplicates)
        IF NOT EXISTS (
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
            
            RAISE NOTICE 'Successfully re-created ride request';
        ELSE
            RAISE NOTICE 'Ride request already exists, skipping creation';
        END IF;
        
        -- Apply fine to driver's wallet if fare exists
        IF v_fine_amount > 0 THEN
            UPDATE users 
            SET wallet_balance = GREATEST(0, wallet_balance - v_fine_amount)
            WHERE id = v_ride_record.driver_id;
            
            -- Create transaction record for the fine
            INSERT INTO transactions (user_id, amount, type, description, ride_id, created_at)
            VALUES (
                v_ride_record.driver_id,
                v_fine_amount,
                'debit',
                'Cancellation fine (10%): ' || p_cancellation_reason,
                p_ride_id,
                NOW()
            );
            
            RAISE NOTICE 'Successfully applied fine: %', v_fine_amount;
        END IF;
        
        -- Delete from rides table
        DELETE FROM rides WHERE id = p_ride_id;
        
        RAISE NOTICE 'Successfully deleted from rides table';
        
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
        
        RAISE NOTICE 'Successfully created notifications';
        
        -- Archive messages related to this ride
        UPDATE messages 
        SET archived = true, archived_at = NOW()
        WHERE ride_id = p_ride_id;
        
        RAISE NOTICE 'Successfully archived messages';
        
        RETURN json_build_object(
            'success', true,
            'message', 'Ride moved back to requests successfully',
            'ride_id', p_ride_id,
            'fine_applied', v_fine_amount
        );
        
    EXCEPTION
        WHEN OTHERS THEN
            v_error_msg := 'Database error during cancellation: ' || SQLERRM;
            RAISE WARNING '%', v_error_msg;
            RETURN json_build_object(
                'success', false,
                'error', v_error_msg,
                'ride_id', p_ride_id
            );
    END;
    
EXCEPTION
    WHEN OTHERS THEN
        v_error_msg := 'Unexpected error: ' || SQLERRM;
        RAISE WARNING '%', v_error_msg;
        RETURN json_build_object(
            'success', false,
            'error', v_error_msg,
            'ride_id', p_ride_id
        );
END;
$$ LANGUAGE plpgsql;
