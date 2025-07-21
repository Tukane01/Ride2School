-- Updated ride completion function that handles transactions properly
CREATE OR REPLACE FUNCTION move_ride_to_completed(
    p_ride_id UUID,
    p_actual_pickup_time TIMESTAMPTZ DEFAULT NULL,
    p_actual_dropoff_time TIMESTAMPTZ DEFAULT NOW(),
    p_distance_traveled DECIMAL DEFAULT NULL,
    p_duration_minutes INTEGER DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ride_record RECORD;
    v_result JSON;
    v_driver_balance DECIMAL;
    v_parent_balance DECIMAL;
BEGIN
    RAISE NOTICE 'Starting ride completion for ride_id: %', p_ride_id;
    
    -- Get the ride record
    SELECT * INTO v_ride_record
    FROM rides 
    WHERE id = p_ride_id;
    
    IF NOT FOUND THEN
        RAISE NOTICE 'Ride not found in active rides table';
        RETURN json_build_object(
            'success', false,
            'error', 'Ride not found in active rides table'
        );
    END IF;
    
    RAISE NOTICE 'Found ride with status: %, fare: %', v_ride_record.status, v_ride_record.fare;
    
    -- Check if ride is already completed
    IF EXISTS (SELECT 1 FROM completed_rides WHERE original_ride_id = p_ride_id) THEN
        RAISE NOTICE 'Ride already completed';
        RETURN json_build_object(
            'success', true,
            'message', 'Ride was already completed',
            'already_completed', true
        );
    END IF;
    
    -- Validate ride status
    IF v_ride_record.status NOT IN ('scheduled', 'in_progress') THEN
        RAISE NOTICE 'Invalid ride status for completion: %', v_ride_record.status;
        RETURN json_build_object(
            'success', false,
            'error', 'Ride cannot be completed in current status: ' || v_ride_record.status
        );
    END IF;
    
    BEGIN
        -- Get current balances
        SELECT wallet_balance INTO v_driver_balance 
        FROM users WHERE id = v_ride_record.driver_id;
        
        SELECT wallet_balance INTO v_parent_balance 
        FROM users WHERE id = v_ride_record.parent_id;
        
        RAISE NOTICE 'Current balances - Driver: %, Parent: %', v_driver_balance, v_parent_balance;
        
        -- Move ride to completed_rides table
        INSERT INTO completed_rides (
            original_ride_id,
            child_id,
            parent_id,
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
            actual_pickup_time,
            actual_dropoff_time,
            distance_traveled,
            duration_minutes,
            fare,
            otp,
            otp_generated_at,
            current_location_lat,
            current_location_lng,
            current_location_address,
            estimated_arrival,
            created_at,
            updated_at
        ) VALUES (
            v_ride_record.id,
            v_ride_record.child_id,
            v_ride_record.parent_id,
            v_ride_record.driver_id,
            v_ride_record.origin_lat,
            v_ride_record.origin_lng,
            v_ride_record.origin_address,
            v_ride_record.destination_lat,
            v_ride_record.destination_lng,
            v_ride_record.destination_address,
            v_ride_record.destination_name,
            v_ride_record.scheduled_time,
            p_actual_dropoff_time,
            p_actual_pickup_time,
            p_actual_dropoff_time,
            p_distance_traveled,
            p_duration_minutes,
            v_ride_record.fare,
            v_ride_record.otp,
            v_ride_record.otp_generated_at,
            v_ride_record.current_location_lat,
            v_ride_record.current_location_lng,
            v_ride_record.current_location_address,
            v_ride_record.estimated_arrival,
            v_ride_record.created_at,
            NOW()
        );
        
        RAISE NOTICE 'Moved ride to completed_rides table';
        
        -- Process payments ONLY after ride completion
        IF v_ride_record.fare > 0 THEN
            -- Charge parent (deduct from wallet)
            UPDATE users 
            SET wallet_balance = wallet_balance - v_ride_record.fare,
                updated_at = NOW()
            WHERE id = v_ride_record.parent_id;
            
            -- Pay driver (add to wallet)
            UPDATE users 
            SET wallet_balance = wallet_balance + v_ride_record.fare,
                updated_at = NOW()
            WHERE id = v_ride_record.driver_id;
            
            RAISE NOTICE 'Processed payments - Parent charged: %, Driver paid: %', v_ride_record.fare, v_ride_record.fare;
            
            -- Create NEW transaction records with the original ride ID for historical reference
            -- These will NOT have foreign key constraints to the active rides table
            INSERT INTO transactions (user_id, amount, type, description, ride_id, created_at)
            VALUES 
                (v_ride_record.parent_id, v_ride_record.fare, 'debit', 'Ride fare payment', v_ride_record.id, NOW()),
                (v_ride_record.driver_id, v_ride_record.fare, 'credit', 'Ride completion earnings', v_ride_record.id, NOW());
            
            RAISE NOTICE 'Created transaction records';
        END IF;
        
        -- Archive messages for this ride (don't delete, just mark as archived)
        UPDATE messages 
        SET archived = true, archived_at = NOW()
        WHERE ride_id = v_ride_record.id;
        
        RAISE NOTICE 'Archived messages for completed ride';
        
        -- Update notifications to remove ride_id reference (set to NULL)
        UPDATE notifications 
        SET ride_id = NULL
        WHERE ride_id = v_ride_record.id;
        
        RAISE NOTICE 'Updated notifications to remove ride reference';
        
        -- Now it's safe to delete from active rides table
        -- The CASCADE DELETE will handle any remaining transaction references
        DELETE FROM rides WHERE id = p_ride_id;
        RAISE NOTICE 'Deleted ride from active rides table';
        
        -- Create completion notifications
        INSERT INTO notifications (user_id, title, content, type, created_at)
        VALUES 
            (v_ride_record.parent_id, 'Ride Completed', 'Your child''s ride has been completed successfully.', 'ride_completed', NOW()),
            (v_ride_record.driver_id, 'Ride Completed', 'You have successfully completed the ride and earned R' || v_ride_record.fare::text || '.', 'ride_completed', NOW());
        
        RAISE NOTICE 'Created completion notifications';
        
        v_result := json_build_object(
            'success', true,
            'message', 'Ride completed successfully',
            'fare', v_ride_record.fare,
            'ride_removed', true,
            'parent_charged', v_ride_record.fare,
            'driver_paid', v_ride_record.fare
        );
        
        RAISE NOTICE 'Ride completion successful: %', v_result;
        RETURN v_result;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error during ride completion: % %', SQLSTATE, SQLERRM;
        RETURN json_build_object(
            'success', false,
            'error', 'Database error during completion: ' || SQLERRM
        );
    END;
END;
$$;

-- Updated driver cancellation function that handles transactions properly
CREATE OR REPLACE FUNCTION move_ride_back_to_requests(
    p_ride_id UUID,
    p_cancellation_reason TEXT DEFAULT 'Cancelled by driver'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ride_record RECORD;
    v_penalty_amount DECIMAL;
    v_driver_balance DECIMAL;
    v_new_balance DECIMAL;
    v_result JSON;
BEGIN
    RAISE NOTICE 'Starting driver cancellation for ride_id: %', p_ride_id;
    
    -- Get the ride record
    SELECT * INTO v_ride_record
    FROM rides 
    WHERE id = p_ride_id;
    
    IF NOT FOUND THEN
        RAISE NOTICE 'Ride not found in active rides table';
        RETURN json_build_object(
            'success', false,
            'error', 'Ride not found in active rides table'
        );
    END IF;
    
    RAISE NOTICE 'Found ride with status: %, fare: %', v_ride_record.status, v_ride_record.fare;
    
    -- Calculate 10% penalty
    v_penalty_amount := COALESCE(v_ride_record.fare, 0) * 0.10;
    RAISE NOTICE 'Calculated penalty amount: %', v_penalty_amount;
    
    BEGIN
        -- Get current driver balance
        SELECT wallet_balance INTO v_driver_balance 
        FROM users WHERE id = v_ride_record.driver_id;
        
        RAISE NOTICE 'Current driver balance: %', v_driver_balance;
        
        -- Apply penalty (allow negative balance)
        v_new_balance := v_driver_balance - v_penalty_amount;
        
        UPDATE users 
        SET wallet_balance = v_new_balance,
            updated_at = NOW()
        WHERE id = v_ride_record.driver_id;
        
        RAISE NOTICE 'Applied penalty - New driver balance: %', v_new_balance;
        
        -- Create penalty transaction record with the original ride ID for historical reference
        IF v_penalty_amount > 0 THEN
            INSERT INTO transactions (user_id, amount, type, description, ride_id, created_at)
            VALUES (
                v_ride_record.driver_id, 
                v_penalty_amount, 
                'debit', 
                'Cancellation penalty (10% of fare)', 
                v_ride_record.id, 
                NOW()
            );
            RAISE NOTICE 'Created penalty transaction record';
        END IF;
        
        -- Archive messages for this ride (don't delete, just mark as archived)
        UPDATE messages 
        SET archived = true, archived_at = NOW()
        WHERE ride_id = v_ride_record.id;
        
        RAISE NOTICE 'Archived messages for cancelled ride';
        
        -- Update notifications to remove ride_id reference (set to NULL)
        UPDATE notifications 
        SET ride_id = NULL
        WHERE ride_id = v_ride_record.id;
        
        RAISE NOTICE 'Updated notifications to remove ride reference';
        
        -- Move ride back to ride_requests table
        INSERT INTO ride_requests (
            id,
            child_id,
            parent_id,
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
            gen_random_uuid(),
            v_ride_record.child_id,
            v_ride_record.parent_id,
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
            'Ride cancelled by driver and made available again',
            v_ride_record.created_at,
            NOW()
        );
        
        RAISE NOTICE 'Moved ride back to ride_requests table';
        
        -- Now it's safe to delete from active rides table
        -- The CASCADE DELETE will handle any remaining transaction references
        DELETE FROM rides WHERE id = p_ride_id;
        RAISE NOTICE 'Deleted ride from active rides table';
        
        -- Create cancellation notifications
        INSERT INTO notifications (user_id, title, content, type, created_at)
        VALUES 
            (v_ride_record.parent_id, 'Ride Cancelled', 'Your ride has been cancelled by the driver. The ride is now available for other drivers to accept.', 'ride_cancelled', NOW()),
            (v_ride_record.driver_id, 'Ride Cancelled', 'You have cancelled the ride. A penalty of R' || v_penalty_amount::text || ' has been applied to your account.', 'ride_cancelled', NOW());
        
        RAISE NOTICE 'Created cancellation notifications';
        
        v_result := json_build_object(
            'success', true,
            'message', 'Ride cancelled and moved back to requests',
            'penalty_applied', v_penalty_amount,
            'new_driver_balance', v_new_balance,
            'moved_to_requests', true
        );
        
        RAISE NOTICE 'Driver cancellation successful: %', v_result;
        RETURN v_result;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error during driver cancellation: % %', SQLSTATE, SQLERRM;
        RETURN json_build_object(
            'success', false,
            'error', 'Database error during cancellation: ' || SQLERRM
        );
    END;
END;
$$;

-- Updated parent cancellation function that handles transactions properly
CREATE OR REPLACE FUNCTION move_ride_to_cancelled(
    p_ride_id UUID,
    p_cancelled_by_user_id UUID,
    p_cancellation_reason TEXT DEFAULT 'Cancelled by parent'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ride_record RECORD;
    v_penalty_amount DECIMAL;
    v_parent_balance DECIMAL;
    v_new_balance DECIMAL;
    v_result JSON;
BEGIN
    RAISE NOTICE 'Starting parent cancellation for ride_id: %', p_ride_id;
    
    -- Get the ride record
    SELECT * INTO v_ride_record
    FROM rides 
    WHERE id = p_ride_id;
    
    IF NOT FOUND THEN
        RAISE NOTICE 'Ride not found in active rides table';
        RETURN json_build_object(
            'success', false,
            'error', 'Ride not found in active rides table'
        );
    END IF;
    
    RAISE NOTICE 'Found ride with status: %, fare: %', v_ride_record.status, v_ride_record.fare;
    
    -- Calculate 10% penalty
    v_penalty_amount := COALESCE(v_ride_record.fare, 0) * 0.10;
    RAISE NOTICE 'Calculated penalty amount: %', v_penalty_amount;
    
    BEGIN
        -- Get current parent balance
        SELECT wallet_balance INTO v_parent_balance 
        FROM users WHERE id = v_ride_record.parent_id;
        
        RAISE NOTICE 'Current parent balance: %', v_parent_balance;
        
        -- Apply penalty (allow negative balance)
        v_new_balance := v_parent_balance - v_penalty_amount;
        
        UPDATE users 
        SET wallet_balance = v_new_balance,
            updated_at = NOW()
        WHERE id = v_ride_record.parent_id;
        
        RAISE NOTICE 'Applied penalty - New parent balance: %', v_new_balance;
        
        -- Create penalty transaction record with the original ride ID for historical reference
        IF v_penalty_amount > 0 THEN
            INSERT INTO transactions (user_id, amount, type, description, ride_id, created_at)
            VALUES (
                v_ride_record.parent_id, 
                v_penalty_amount, 
                'debit', 
                'Cancellation penalty (10% of fare)', 
                v_ride_record.id, 
                NOW()
            );
            RAISE NOTICE 'Created penalty transaction record';
        END IF;
        
        -- Archive messages for this ride (don't delete, just mark as archived)
        UPDATE messages 
        SET archived = true, archived_at = NOW()
        WHERE ride_id = v_ride_record.id;
        
        RAISE NOTICE 'Archived messages for cancelled ride';
        
        -- Update notifications to remove ride_id reference (set to NULL)
        UPDATE notifications 
        SET ride_id = NULL
        WHERE ride_id = v_ride_record.id;
        
        RAISE NOTICE 'Updated notifications to remove ride reference';
        
        -- Move ride to cancelled_rides table
        INSERT INTO cancelled_rides (
            original_ride_id,
            child_id,
            parent_id,
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
            otp,
            otp_generated_at,
            current_location_lat,
            current_location_lng,
            current_location_address,
            estimated_arrival,
            created_at,
            updated_at
        ) VALUES (
            v_ride_record.id,
            v_ride_record.child_id,
            v_ride_record.parent_id,
            v_ride_record.driver_id,
            v_ride_record.origin_lat,
            v_ride_record.origin_lng,
            v_ride_record.origin_address,
            v_ride_record.destination_lat,
            v_ride_record.destination_lng,
            v_ride_record.destination_address,
            v_ride_record.destination_name,
            v_ride_record.scheduled_time,
            NOW(),
            p_cancelled_by_user_id,
            p_cancellation_reason,
            v_ride_record.fare,
            v_ride_record.otp,
            v_ride_record.otp_generated_at,
            v_ride_record.current_location_lat,
            v_ride_record.current_location_lng,
            v_ride_record.current_location_address,
            v_ride_record.estimated_arrival,
            v_ride_record.created_at,
            NOW()
        );
        
        RAISE NOTICE 'Moved ride to cancelled_rides table';
        
        -- Now it's safe to delete from active rides table
        -- The CASCADE DELETE will handle any remaining transaction references
        DELETE FROM rides WHERE id = p_ride_id;
        RAISE NOTICE 'Deleted ride from active rides table';
        
        -- Create cancellation notifications
        INSERT INTO notifications (user_id, title, content, type, created_at)
        VALUES 
            (v_ride_record.parent_id, 'Ride Cancelled', 'You have cancelled the ride. A penalty of R' || v_penalty_amount::text || ' has been applied to your account.', 'ride_cancelled', NOW()),
            (v_ride_record.driver_id, 'Ride Cancelled', 'The ride has been cancelled by the parent.', 'ride_cancelled', NOW());
        
        RAISE NOTICE 'Created cancellation notifications';
        
        v_result := json_build_object(
            'success', true,
            'message', 'Ride cancelled successfully',
            'penalty_applied', v_penalty_amount,
            'new_parent_balance', v_new_balance,
            'moved_to_cancelled', true
        );
        
        RAISE NOTICE 'Parent cancellation successful: %', v_result;
        RETURN v_result;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error during parent cancellation: % %', SQLSTATE, SQLERRM;
        RETURN json_build_object(
            'success', false,
            'error', 'Database error during cancellation: ' || SQLERRM
        );
    END;
END;
$$;
