-- Core database functions for ride management

-- Function to generate OTP
CREATE OR REPLACE FUNCTION generate_otp()
RETURNS VARCHAR(6) AS $$
BEGIN
    RETURN LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to accept a ride request
CREATE OR REPLACE FUNCTION accept_ride_request(
    p_request_id UUID,
    p_driver_id UUID,
    p_estimated_fare DECIMAL(10, 2)
)
RETURNS JSON AS $$
DECLARE
    request_record RECORD;
    new_ride_id UUID;
    generated_otp VARCHAR(6);
    result JSON;
BEGIN
    -- Get the ride request
    SELECT * INTO request_record FROM ride_requests WHERE id = p_request_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ride request not found or already accepted';
    END IF;
    
    -- Generate new ride ID and OTP
    new_ride_id := uuid_generate_v4();
    generated_otp := generate_otp();
    
    -- Insert into rides table
    INSERT INTO rides (
        id,
        request_id,
        parent_id,
        child_id,
        driver_id,
        origin_address,
        origin_lat,
        origin_lng,
        destination_address,
        destination_lat,
        destination_lng,
        destination_name,
        scheduled_time,
        fare,
        otp,
        otp_generated_at,
        status
    ) VALUES (
        new_ride_id,
        p_request_id,
        request_record.parent_id,
        request_record.child_id,
        p_driver_id,
        request_record.origin_address,
        request_record.origin_lat,
        request_record.origin_lng,
        request_record.destination_address,
        request_record.destination_lat,
        request_record.destination_lng,
        request_record.destination_name,
        request_record.scheduled_time,
        p_estimated_fare,
        generated_otp,
        NOW(),
        'scheduled'
    );
    
    -- Update ride request status
    UPDATE ride_requests SET status = 'accepted', updated_at = NOW() WHERE id = p_request_id;
    
    -- Create notifications
    INSERT INTO notifications (user_id, ride_id, title, message, type) VALUES
    (request_record.parent_id, new_ride_id, 'Ride Accepted', 'Your ride request has been accepted by a driver', 'ride_accepted'),
    (p_driver_id, new_ride_id, 'Ride Assigned', 'You have been assigned a new ride', 'ride_assigned');
    
    result := json_build_object(
        'success', true,
        'ride_id', new_ride_id,
        'otp', generated_otp,
        'message', 'Ride request accepted successfully'
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to move ride to completed with driver payment
CREATE OR REPLACE FUNCTION move_ride_to_completed(
    p_ride_id UUID,
    p_actual_pickup_time TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_actual_dropoff_time TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_distance_traveled NUMERIC DEFAULT NULL,
    p_duration_minutes INTEGER DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    ride_record RECORD;
    completion_time TIMESTAMP WITH TIME ZONE;
    existing_completed_ride RECORD;
    result JSON;
BEGIN
    completion_time := COALESCE(p_actual_dropoff_time, NOW());
    
    -- Check if already completed
    SELECT * INTO existing_completed_ride FROM completed_rides WHERE original_ride_id = p_ride_id;
    
    IF FOUND THEN
        result := json_build_object(
            'success', true,
            'already_completed', true,
            'message', 'Ride was already completed at ' || existing_completed_ride.completed_at
        );
        RETURN result;
    END IF;
    
    -- Get the ride data
    SELECT * INTO ride_record FROM rides WHERE id = p_ride_id FOR UPDATE NOWAIT;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ride not found';
    END IF;
    
    -- Insert into completed_rides
    INSERT INTO completed_rides (
        original_ride_id, parent_id, driver_id, child_id,
        origin_lat, origin_lng, origin_address,
        destination_lat, destination_lng, destination_address, destination_name,
        scheduled_time, completed_at, actual_pickup_time, actual_dropoff_time,
        distance_traveled, duration_minutes, fare, otp, otp_generated_at,
        current_location_lat, current_location_lng, current_location_address,
        estimated_arrival, request_id, created_at, updated_at
    ) VALUES (
        ride_record.id, ride_record.parent_id, ride_record.driver_id, ride_record.child_id,
        ride_record.origin_lat, ride_record.origin_lng, ride_record.origin_address,
        ride_record.destination_lat, ride_record.destination_lng, ride_record.destination_address, ride_record.destination_name,
        ride_record.scheduled_time, completion_time, COALESCE(p_actual_pickup_time, ride_record.scheduled_time), completion_time,
        p_distance_traveled, p_duration_minutes, ride_record.fare, ride_record.otp, ride_record.otp_generated_at,
        ride_record.current_location_lat, ride_record.current_location_lng, ride_record.current_location_address,
        ride_record.estimated_arrival, ride_record.request_id, ride_record.created_at, NOW()
    );
    
    -- Pay the driver
    IF ride_record.fare IS NOT NULL AND ride_record.fare > 0 THEN
        UPDATE users SET wallet_balance = COALESCE(wallet_balance, 0) + ride_record.fare WHERE id = ride_record.driver_id;
        
        INSERT INTO transactions (user_id, amount, type, description, ride_id, created_at) VALUES
        (ride_record.driver_id, ride_record.fare, 'credit', 'Payment for completed ride', p_ride_id, NOW());
    END IF;
    
    -- Update driver stats
    UPDATE driver_profiles SET total_rides_completed = total_rides_completed + 1 WHERE user_id = ride_record.driver_id;
    
    -- Delete from rides table
    DELETE FROM rides WHERE id = p_ride_id;
    
    -- Create completion notifications
    INSERT INTO notifications (user_id, ride_id, title, message, type) VALUES
    (ride_record.parent_id, p_ride_id, 'Ride Completed', 'Your ride has been completed successfully', 'ride_completed'),
    (ride_record.driver_id, p_ride_id, 'Ride Completed', 'Ride completed. Payment of R' || COALESCE(ride_record.fare, 0) || ' has been added to your wallet', 'ride_completed');
    
    result := json_build_object(
        'success', true,
        'completed_at', completion_time,
        'driver_paid', ride_record.fare IS NOT NULL AND ride_record.fare > 0,
        'payment_amount', COALESCE(ride_record.fare, 0),
        'message', 'Ride completed successfully. Driver has been paid R' || COALESCE(ride_record.fare, 0)
    );
    
    RETURN result;
    
EXCEPTION
    WHEN lock_not_available THEN
        RAISE EXCEPTION 'Ride is currently being processed by another operation. Please try again.';
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error completing ride: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Function to cancel ride with fines
CREATE OR REPLACE FUNCTION move_ride_to_cancelled(
    p_ride_id UUID,
    p_cancelled_by_user_id UUID,
    p_cancellation_reason TEXT DEFAULT 'No reason provided',
    p_fine_amount DECIMAL(10, 2) DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    ride_record RECORD;
    canceller_type TEXT;
    calculated_fine DECIMAL(10, 2) := 0.00;
    result JSON;
BEGIN
    SELECT * INTO ride_record FROM rides WHERE id = p_ride_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ride not found';
    END IF;
    
    -- Determine canceller and calculate fine
    IF p_cancelled_by_user_id = ride_record.driver_id THEN
        canceller_type := 'driver';
        calculated_fine := COALESCE(ride_record.fare * 0.10, 0.00);
    ELSIF p_cancelled_by_user_id = ride_record.parent_id THEN
        canceller_type := 'parent';
        calculated_fine := COALESCE(ride_record.fare * 0.10, 0.00);
    ELSE
        RAISE EXCEPTION 'User not authorized to cancel this ride';
    END IF;
    
    IF p_fine_amount IS NOT NULL THEN
        calculated_fine := p_fine_amount;
    END IF;
    
    -- Apply fine
    IF calculated_fine > 0 THEN
        UPDATE users SET wallet_balance = GREATEST(0, wallet_balance - calculated_fine) WHERE id = p_cancelled_by_user_id;
        
        INSERT INTO transactions (user_id, amount, type, description, ride_id, created_at) VALUES
        (p_cancelled_by_user_id, calculated_fine, 'debit', 'Cancellation fine (10% of ride fare)', p_ride_id, NOW());
    END IF;
    
    -- Insert into cancelled_rides
    INSERT INTO cancelled_rides (
        original_ride_id, request_id, parent_id, child_id, driver_id,
        origin_address, origin_lat, origin_lng, destination_address, destination_lat, destination_lng, destination_name,
        scheduled_time, fare, otp, otp_generated_at, current_location_lat, current_location_lng, current_location_address,
        estimated_arrival, cancelled_at, cancelled_by, cancellation_reason, cancellation_fine, fine_applied, created_at, updated_at
    ) VALUES (
        ride_record.id, ride_record.request_id, ride_record.parent_id, ride_record.child_id, ride_record.driver_id,
        ride_record.origin_address, ride_record.origin_lat, ride_record.origin_lng, ride_record.destination_address, ride_record.destination_lat, ride_record.destination_lng, ride_record.destination_name,
        ride_record.scheduled_time, ride_record.fare, ride_record.otp, ride_record.otp_generated_at, ride_record.current_location_lat, ride_record.current_location_lng, ride_record.current_location_address,
        ride_record.estimated_arrival, NOW(), p_cancelled_by_user_id, p_cancellation_reason, calculated_fine, calculated_fine > 0, ride_record.created_at, NOW()
    );
    
    -- Update cancellation stats for parents
    IF canceller_type = 'parent' THEN
        UPDATE users SET 
            total_cancellations = COALESCE(total_cancellations, 0) + 1,
            cancellation_rate = CASE 
                WHEN COALESCE(total_ride_requests, 0) > 0 THEN 
                    (COALESCE(total_cancellations, 0) + 1) * 100.0 / COALESCE(total_ride_requests, 1)
                ELSE 0 
            END
        WHERE id = ride_record.parent_id;
    END IF;
    
    DELETE FROM rides WHERE id = p_ride_id;
    
    -- Create cancellation notifications
    INSERT INTO notifications (user_id, ride_id, title, message, type) VALUES
    (ride_record.parent_id, p_ride_id, 'Ride Cancelled', 'Your ride has been cancelled. ' || CASE WHEN calculated_fine > 0 THEN 'Fine: R' || calculated_fine ELSE '' END, 'ride_cancelled'),
    (ride_record.driver_id, p_ride_id, 'Ride Cancelled', 'Ride has been cancelled. ' || CASE WHEN calculated_fine > 0 THEN 'Fine: R' || calculated_fine ELSE '' END, 'ride_cancelled');
    
    result := json_build_object(
        'success', true,
        'canceller_type', canceller_type,
        'fine_applied', calculated_fine > 0,
        'fine_amount', calculated_fine,
        'message', CASE 
            WHEN calculated_fine > 0 THEN 'Ride cancelled. A fine of R' || calculated_fine || ' has been applied.'
            ELSE 'Ride cancelled successfully.'
        END
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to update ride request count
CREATE OR REPLACE FUNCTION increment_ride_request_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users SET 
        total_ride_requests = COALESCE(total_ride_requests, 0) + 1,
        cancellation_rate = CASE 
            WHEN COALESCE(total_ride_requests, 0) + 1 > 0 THEN 
                COALESCE(total_cancellations, 0) * 100.0 / (COALESCE(total_ride_requests, 0) + 1)
            ELSE 0 
        END
    WHERE id = NEW.parent_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to delete user account completely
CREATE OR REPLACE FUNCTION delete_user_account(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    user_record RECORD;
    result JSON;
BEGIN
    -- Get user info
    SELECT * INTO user_record FROM users WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    -- Check for active rides
    IF EXISTS (SELECT 1 FROM rides WHERE parent_id = p_user_id OR driver_id = p_user_id) THEN
        RAISE EXCEPTION 'Cannot delete account with active rides';
    END IF;
    
    -- Archive messages
    UPDATE messages SET updated_at = NOW() WHERE sender_id = p_user_id OR receiver_id = p_user_id;
    
    -- Delete user data (cascading will handle related records)
    DELETE FROM users WHERE id = p_user_id;
    
    result := json_build_object(
        'success', true,
        'message', 'Account deleted successfully'
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION generate_otp TO authenticated;
GRANT EXECUTE ON FUNCTION accept_ride_request TO authenticated;
GRANT EXECUTE ON FUNCTION move_ride_to_completed TO authenticated;
GRANT EXECUTE ON FUNCTION move_ride_to_cancelled TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_account TO authenticated;
GRANT EXECUTE ON FUNCTION increment_ride_request_count TO authenticated;
