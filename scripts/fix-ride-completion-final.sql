-- Final comprehensive fix for ride completion
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
    v_error_msg TEXT;
BEGIN
    -- Log the attempt
    RAISE NOTICE 'Attempting to complete ride: %', p_ride_id;
    
    -- First, check if the ride exists in the rides table
    SELECT * INTO v_ride_record
    FROM rides 
    WHERE id = p_ride_id;
    
    -- If ride not found, check if it's already completed
    IF NOT FOUND THEN
        -- Check if ride exists in completed_rides
        IF EXISTS (SELECT 1 FROM completed_rides WHERE original_ride_id = p_ride_id) THEN
            RAISE NOTICE 'Ride % is already completed', p_ride_id;
            RETURN json_build_object(
                'success', true,
                'message', 'Ride was already completed',
                'already_completed', true,
                'ride_id', p_ride_id
            );
        END IF;
        
        -- Check if ride exists in cancelled_rides
        IF EXISTS (SELECT 1 FROM cancelled_rides WHERE original_ride_id = p_ride_id) THEN
            v_error_msg := 'Cannot complete ride - it has been cancelled';
            RAISE WARNING '%', v_error_msg;
            RETURN json_build_object(
                'success', false,
                'error', v_error_msg,
                'ride_id', p_ride_id
            );
        END IF;
        
        -- Ride doesn't exist anywhere
        v_error_msg := 'Ride not found in active rides table';
        RAISE WARNING '%', v_error_msg;
        RETURN json_build_object(
            'success', false,
            'error', v_error_msg,
            'ride_id', p_ride_id
        );
    END IF;
    
    -- Log ride details
    RAISE NOTICE 'Found ride: % with status: %', p_ride_id, v_ride_record.status;
    
    -- Check if ride is in a completable state
    IF v_ride_record.status NOT IN ('scheduled', 'in_progress') THEN
        v_error_msg := 'Ride cannot be completed with status: ' || v_ride_record.status;
        RAISE WARNING '%', v_error_msg;
        RETURN json_build_object(
            'success', false,
            'error', v_error_msg,
            'current_status', v_ride_record.status,
            'ride_id', p_ride_id
        );
    END IF;
    
    -- Begin transaction for completion
    BEGIN
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
        
        RAISE NOTICE 'Successfully inserted into completed_rides';
        
        -- Delete from rides table
        DELETE FROM rides WHERE id = p_ride_id;
        
        RAISE NOTICE 'Successfully deleted from rides table';
        
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
        
        RAISE NOTICE 'Successfully created notification';
        
        -- Archive messages related to this ride
        UPDATE messages 
        SET archived = true, archived_at = NOW()
        WHERE ride_id = p_ride_id;
        
        RAISE NOTICE 'Successfully archived messages';
        
        RETURN json_build_object(
            'success', true,
            'message', 'Ride completed successfully',
            'ride_id', p_ride_id,
            'completed_at', NOW(),
            'fare', v_ride_record.fare
        );
        
    EXCEPTION
        WHEN OTHERS THEN
            v_error_msg := 'Database error during completion: ' || SQLERRM;
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
