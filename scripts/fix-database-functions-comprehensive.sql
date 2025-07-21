-- Comprehensive fix for all database functions and triggers

-- 1. Fix the move_ride_to_completed function
CREATE OR REPLACE FUNCTION move_ride_to_completed(
    p_ride_id UUID,
    p_actual_pickup_time TIMESTAMP DEFAULT NULL,
    p_actual_dropoff_time TIMESTAMP DEFAULT NULL,
    p_distance_traveled DECIMAL DEFAULT NULL,
    p_duration_minutes INTEGER DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    ride_record RECORD;
BEGIN
    -- Get the ride record
    SELECT * INTO ride_record
    FROM rides 
    WHERE id = p_ride_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ride not found with id: %', p_ride_id;
    END IF;
    
    -- Insert into completed_rides table
    INSERT INTO completed_rides (
        original_ride_id,
        parent_id,
        child_id,
        driver_id,
        origin_lat,
        origin_lng,
        origin_address,
        destination_lat,
        destination_lng,
        destination_address,
        destination_name,
        scheduled_time,
        completed_at,
        fare,
        otp,
        otp_generated_at,
        current_location_lat,
        current_location_lng,
        current_location_address,
        estimated_arrival,
        actual_pickup_time,
        actual_dropoff_time,
        distance_traveled,
        duration_minutes,
        created_at
    ) VALUES (
        ride_record.id,
        ride_record.parent_id,
        ride_record.child_id,
        ride_record.driver_id,
        ride_record.origin_lat,
        ride_record.origin_lng,
        ride_record.origin_address,
        ride_record.destination_lat,
        ride_record.destination_lng,
        ride_record.destination_address,
        ride_record.destination_name,
        ride_record.scheduled_time,
        COALESCE(p_actual_dropoff_time, NOW()),
        ride_record.fare,
        ride_record.otp,
        ride_record.otp_generated_at,
        ride_record.current_location_lat,
        ride_record.current_location_lng,
        ride_record.current_location_address,
        ride_record.estimated_arrival,
        p_actual_pickup_time,
        COALESCE(p_actual_dropoff_time, NOW()),
        p_distance_traveled,
        p_duration_minutes,
        ride_record.created_at
    );
    
    -- Delete from rides table
    DELETE FROM rides WHERE id = p_ride_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error moving ride to completed: %', SQLERRM;
END;
$$;

-- 2. Fix the move_ride_to_cancelled function with proper fine calculation
CREATE OR REPLACE FUNCTION move_ride_to_cancelled(
    p_ride_id UUID,
    p_cancelled_by_user_id UUID,
    p_cancellation_reason TEXT DEFAULT NULL,
    p_fine_amount DECIMAL DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    ride_record RECORD;
    user_record RECORD;
    calculated_fine DECIMAL := 0;
    time_until_ride INTERVAL;
    fine_percentage DECIMAL := 0;
BEGIN
    -- Get the ride record
    SELECT * INTO ride_record
    FROM rides 
    WHERE id = p_ride_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ride not found with id: %', p_ride_id;
    END IF;
    
    -- Get user info
    SELECT * INTO user_record
    FROM users 
    WHERE id = p_cancelled_by_user_id;
    
    -- Calculate fine based on cancellation timing (only for parents)
    IF user_record.user_type = 'parent' THEN
        time_until_ride := ride_record.scheduled_time - NOW();
        
        -- Fine calculation based on time until ride
        IF time_until_ride < INTERVAL '30 minutes' THEN
            fine_percentage := 0.50; -- 50% of fare
        ELSIF time_until_ride < INTERVAL '2 hours' THEN
            fine_percentage := 0.25; -- 25% of fare
        ELSIF time_until_ride < INTERVAL '24 hours' THEN
            fine_percentage := 0.10; -- 10% of fare
        ELSE
            fine_percentage := 0; -- No fine for early cancellation
        END IF;
        
        calculated_fine := COALESCE(p_fine_amount, ride_record.fare * fine_percentage);
        
        -- Deduct fine from parent's wallet if there's a fine
        IF calculated_fine > 0 THEN
            UPDATE users 
            SET wallet_balance = GREATEST(0, wallet_balance - calculated_fine)
            WHERE id = ride_record.parent_id;
            
            -- Add transaction record for the fine
            INSERT INTO transactions (
                user_id,
                amount,
                type,
                description,
                ride_id
            ) VALUES (
                ride_record.parent_id,
                calculated_fine,
                'debit',
                'Cancellation fee for ride: ' || ride_record.origin_address || ' to ' || ride_record.destination_address,
                p_ride_id
            );
        END IF;
    END IF;
    
    -- Insert into cancelled_rides table
    INSERT INTO cancelled_rides (
        original_ride_id,
        parent_id,
        child_id,
        driver_id,
        origin_lat,
        origin_lng,
        origin_address,
        destination_lat,
        destination_lng,
        destination_address,
        destination_name,
        scheduled_time,
        cancelled_at,
        cancelled_by,
        cancellation_reason,
        fare,
        fine_amount,
        otp,
        otp_generated_at,
        current_location_lat,
        current_location_lng,
        current_location_address,
        estimated_arrival,
        created_at
    ) VALUES (
        ride_record.id,
        ride_record.parent_id,
        ride_record.child_id,
        ride_record.driver_id,
        ride_record.origin_lat,
        ride_record.origin_lng,
        ride_record.origin_address,
        ride_record.destination_lat,
        ride_record.destination_lng,
        ride_record.destination_address,
        ride_record.destination_name,
        ride_record.scheduled_time,
        NOW(),
        p_cancelled_by_user_id,
        p_cancellation_reason,
        ride_record.fare,
        calculated_fine,
        ride_record.otp,
        ride_record.otp_generated_at,
        ride_record.current_location_lat,
        ride_record.current_location_lng,
        ride_record.current_location_address,
        ride_record.estimated_arrival,
        ride_record.created_at
    );
    
    -- Update parent's cancellation stats
    UPDATE users 
    SET 
        total_cancellations = COALESCE(total_cancellations, 0) + 1,
        cancellation_rate = CASE 
            WHEN COALESCE(total_ride_requests, 0) > 0 THEN 
                (COALESCE(total_cancellations, 0) + 1)::DECIMAL / total_ride_requests::DECIMAL * 100
            ELSE 0 
        END
    WHERE id = ride_record.parent_id;
    
    -- Delete from rides table
    DELETE FROM rides WHERE id = p_ride_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error moving ride to cancelled: %', SQLERRM;
END;
$$;

-- 3. Fix the move_ride_back_to_requests function (for driver cancellations)
CREATE OR REPLACE FUNCTION move_ride_back_to_requests(
    p_ride_id UUID,
    p_cancellation_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    ride_record RECORD;
BEGIN
    -- Get the ride record
    SELECT * INTO ride_record
    FROM rides 
    WHERE id = p_ride_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ride not found with id: %', p_ride_id;
    END IF;
    
    -- Insert back into ride_requests table
    INSERT INTO ride_requests (
        child_id,
        parent_id,
        origin_address,
        origin_lat,
        origin_lng,
        destination_address,
        destination_lat,
        destination_lng,
        destination_name,
        scheduled_time,
        estimated_fare,
        notes,
        status,
        created_at,
        updated_at
    ) VALUES (
        ride_record.child_id,
        ride_record.parent_id,
        ride_record.origin_address,
        ride_record.origin_lat,
        ride_record.origin_lng,
        ride_record.destination_address,
        ride_record.destination_lat,
        ride_record.destination_lng,
        ride_record.destination_name,
        ride_record.scheduled_time,
        ride_record.fare,
        p_cancellation_reason,
        'pending',
        ride_record.created_at,
        NOW()
    );
    
    -- Delete from rides table
    DELETE FROM rides WHERE id = p_ride_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error moving ride back to requests: %', SQLERRM;
END;
$$;

-- 4. Create function to update driver last online
CREATE OR REPLACE FUNCTION update_driver_last_online(
    driver_id UUID,
    current_time TIMESTAMP
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE users 
    SET last_online = current_time
    WHERE id = driver_id AND user_type = 'driver';
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

-- 5. Create comprehensive account deletion function
CREATE OR REPLACE FUNCTION delete_my_account()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    user_type_var TEXT;
BEGIN
    -- Get current user ID from auth context
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Get user type
    SELECT user_type INTO user_type_var
    FROM users 
    WHERE id = current_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    -- Delete related data based on user type
    IF user_type_var = 'parent' THEN
        -- Delete children
        DELETE FROM children WHERE parent_id = current_user_id;
        
        -- Move active rides to cancelled_rides
        INSERT INTO cancelled_rides (
            original_ride_id, parent_id, child_id, driver_id,
            origin_lat, origin_lng, origin_address,
            destination_lat, destination_lng, destination_address, destination_name,
            scheduled_time, cancelled_at, cancelled_by, cancellation_reason,
            fare, otp, otp_generated_at, current_location_lat, current_location_lng,
            current_location_address, estimated_arrival, created_at
        )
        SELECT 
            id, parent_id, child_id, driver_id,
            origin_lat, origin_lng, origin_address,
            destination_lat, destination_lng, destination_address, destination_name,
            scheduled_time, NOW(), current_user_id, 'Account deletion',
            fare, otp, otp_generated_at, current_location_lat, current_location_lng,
            current_location_address, estimated_arrival, created_at
        FROM rides 
        WHERE parent_id = current_user_id;
        
        -- Delete active rides
        DELETE FROM rides WHERE parent_id = current_user_id;
        
        -- Delete pending ride requests
        DELETE FROM ride_requests WHERE parent_id = current_user_id;
        
    ELSIF user_type_var = 'driver' THEN
        -- Delete car
        DELETE FROM cars WHERE driver_id = current_user_id;
        
        -- Move active rides back to requests
        INSERT INTO ride_requests (
            child_id, parent_id, origin_address, origin_lat, origin_lng,
            destination_address, destination_lat, destination_lng, destination_name,
            scheduled_time, estimated_fare, notes, status, created_at, updated_at
        )
        SELECT 
            child_id, parent_id, origin_address, origin_lat, origin_lng,
            destination_address, destination_lat, destination_lng, destination_name,
            scheduled_time, fare, 'Driver account deleted', 'pending', created_at, NOW()
        FROM rides 
        WHERE driver_id = current_user_id;
        
        -- Delete active rides
        DELETE FROM rides WHERE driver_id = current_user_id;
    END IF;
    
    -- Delete common data
    DELETE FROM payment_cards WHERE user_id = current_user_id;
    DELETE FROM transactions WHERE user_id = current_user_id;
    DELETE FROM messages WHERE sender_id = current_user_id OR recipient_id = current_user_id;
    DELETE FROM notifications WHERE user_id = current_user_id;
    DELETE FROM ratings WHERE rater_id = current_user_id OR rated_id = current_user_id;
    
    -- Finally delete the user
    DELETE FROM users WHERE id = current_user_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error deleting account: %', SQLERRM;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION move_ride_to_completed TO authenticated;
GRANT EXECUTE ON FUNCTION move_ride_to_cancelled TO authenticated;
GRANT EXECUTE ON FUNCTION move_ride_back_to_requests TO authenticated;
GRANT EXECUTE ON FUNCTION update_driver_last_online TO authenticated;
GRANT EXECUTE ON FUNCTION delete_my_account TO authenticated;
