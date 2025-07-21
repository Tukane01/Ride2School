-- Fix ride completion with comprehensive error handling
CREATE OR REPLACE FUNCTION move_ride_to_completed(
    p_ride_id UUID,
    p_actual_pickup_time TIMESTAMP DEFAULT NULL,
    p_actual_dropoff_time TIMESTAMP DEFAULT NULL,
    p_distance_traveled DECIMAL DEFAULT NULL,
    p_duration_minutes INTEGER DEFAULT NULL
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
            'error', 'Ride not found in active rides table',
            'ride_id', p_ride_id
        );
    END IF;
    
    -- Check if ride is in a completable state
    IF v_ride_record.status NOT IN ('scheduled', 'in_progress') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Ride cannot be completed with status: ' || v_ride_record.status,
            'current_status', v_ride_record.status,
            'ride_id', p_ride_id
        );
    END IF;
    
    -- Check if ride is already completed (exists in completed_rides)
    IF EXISTS (SELECT 1 FROM completed_rides WHERE original_ride_id = p_ride_id) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Ride is already completed',
            'ride_id', p_ride_id
        );
    END IF;
    
    -- Insert into completed_rides table
    INSERT INTO completed_rides (
        original_ride_id,
        parent_id,
        driver_id,
        child_id,
        origin_lat,
        origin_lng,
        origin_address,
        destination_lat,
        destination_lng,
        destination_address,
        destination_name,
        scheduled_time,
        completed_at,
        actual_pickup_time,
        actual_dropoff_time,
        distance_traveled,
        duration_minutes,
        fare,
        otp,
        current_location_lat,
        current_location_lng,
        current_location_address,
        estimated_arrival
    ) VALUES (
        v_ride_record.id,
        v_ride_record.parent_id,
        v_ride_record.driver_id,
        v_ride_record.child_id,
        v_ride_record.origin_lat,
        v_ride_record.origin_lng,
        v_ride_record.origin_address,
        v_ride_record.destination_lat,
        v_ride_record.destination_lng,
        v_ride_record.destination_address,
        v_ride_record.destination_name,
        v_ride_record.scheduled_time,
        COALESCE(p_actual_dropoff_time, NOW()),
        p_actual_pickup_time,
        p_actual_dropoff_time,
        p_distance_traveled,
        p_duration_minutes,
        v_ride_record.fare,
        v_ride_record.otp,
        v_ride_record.current_location_lat,
        v_ride_record.current_location_lng,
        v_ride_record.current_location_address,
        v_ride_record.estimated_arrival
    );
    
    -- Delete from rides table
    DELETE FROM rides WHERE id = p_ride_id;
    
    -- Create notification for parent
    INSERT INTO notifications (user_id, title, content, type, ride_id, created_at)
    VALUES (
        v_ride_record.parent_id,
        'Ride Completed',
        'Your child''s ride has been completed successfully.',
        'ride_completed',
        p_ride_id,
        NOW()
    );
    
    -- Archive messages related to this ride
    UPDATE messages 
    SET archived = true, archived_at = NOW()
    WHERE ride_id = p_ride_id;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Ride completed successfully',
        'ride_id', p_ride_id,
        'completed_at', NOW()
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
