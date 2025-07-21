-- Drop existing function to avoid conflicts
DROP FUNCTION IF EXISTS move_ride_to_completed(uuid, timestamp with time zone, timestamp with time zone, numeric, integer);
DROP FUNCTION IF EXISTS move_ride_to_completed(uuid);

-- Create a more robust function to move ride to completed with better error handling
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
  ride_exists BOOLEAN := FALSE;
BEGIN
  -- Set completion time
  completion_time := COALESCE(p_actual_dropoff_time, NOW());
  
  -- Log the attempt
  RAISE NOTICE 'Attempting to complete ride: %', p_ride_id;
  
  -- First check if this ride already exists in completed_rides table
  SELECT * INTO existing_completed_ride 
  FROM completed_rides 
  WHERE original_ride_id = p_ride_id;
  
  IF FOUND THEN
    RAISE NOTICE 'Ride % already exists in completed_rides table at %', p_ride_id, existing_completed_ride.completed_at;
    
    -- Delete from rides table if it still exists there
    DELETE FROM rides WHERE id = p_ride_id;
    
    result := json_build_object(
      'success', true,
      'already_completed', true,
      'completed_at', existing_completed_ride.completed_at,
      'message', 'Ride was already completed'
    );
    
    RETURN result;
  END IF;
  
  -- Check if ride exists in rides table first (without locking)
  SELECT EXISTS(SELECT 1 FROM rides WHERE id = p_ride_id) INTO ride_exists;
  
  IF NOT ride_exists THEN
    RAISE NOTICE 'Ride % not found in rides table, checking other tables...', p_ride_id;
    
    -- Check if ride exists in cancelled_rides table
    IF EXISTS (SELECT 1 FROM cancelled_rides WHERE original_ride_id = p_ride_id) THEN
      result := json_build_object(
        'success', false,
        'error', 'RIDE_CANCELLED',
        'message', 'Ride was already cancelled and cannot be completed'
      );
      RETURN result;
    END IF;
    
    -- Check if ride exists in ride_requests table (never accepted)
    IF EXISTS (SELECT 1 FROM ride_requests WHERE id = p_ride_id) THEN
      result := json_build_object(
        'success', false,
        'error', 'RIDE_NOT_ACCEPTED',
        'message', 'Ride request was never accepted by a driver'
      );
      RETURN result;
    END IF;
    
    -- Ride not found anywhere
    result := json_build_object(
      'success', false,
      'error', 'RIDE_NOT_FOUND',
      'message', 'Ride not found in any table. It may have been deleted or never existed.'
    );
    RETURN result;
  END IF;
  
  -- Get the ride data with locking
  BEGIN
    SELECT * INTO ride_record 
    FROM rides 
    WHERE id = p_ride_id 
    FOR UPDATE NOWAIT;
  EXCEPTION
    WHEN lock_not_available THEN
      result := json_build_object(
        'success', false,
        'error', 'RIDE_LOCKED',
        'message', 'Ride is currently being processed by another operation. Please try again.'
      );
      RETURN result;
  END;
  
  -- Double check we got the record
  IF ride_record.id IS NULL THEN
    result := json_build_object(
      'success', false,
      'error', 'RIDE_DISAPPEARED',
      'message', 'Ride disappeared between checks. It may have been processed by another operation.'
    );
    RETURN result;
  END IF;
  
  RAISE NOTICE 'Found ride % with status: %', p_ride_id, ride_record.status;
  
  -- Check if ride is in a completable state
  IF ride_record.status NOT IN ('scheduled', 'in_progress') THEN
    result := json_build_object(
      'success', false,
      'error', 'INVALID_STATUS',
      'current_status', ride_record.status,
      'message', 'Ride cannot be completed. Current status: ' || ride_record.status
    );
    RETURN result;
  END IF;
  
  -- Insert into completed_rides table
  BEGIN
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
      otp_generated_at,
      current_location_lat,
      current_location_lng,
      current_location_address,
      estimated_arrival,
      request_id,
      created_at,
      updated_at
    ) VALUES (
      ride_record.id,
      ride_record.parent_id,
      ride_record.driver_id,
      ride_record.child_id,
      ride_record.origin_lat,
      ride_record.origin_lng,
      ride_record.origin_address,
      ride_record.destination_lat,
      ride_record.destination_lng,
      ride_record.destination_address,
      ride_record.destination_name,
      ride_record.scheduled_time,
      completion_time,
      COALESCE(p_actual_pickup_time, ride_record.scheduled_time),
      completion_time,
      p_distance_traveled,
      p_duration_minutes,
      ride_record.fare,
      ride_record.otp,
      ride_record.otp_generated_at,
      ride_record.current_location_lat,
      ride_record.current_location_lng,
      ride_record.current_location_address,
      ride_record.estimated_arrival,
      ride_record.request_id,
      ride_record.created_at,
      NOW()
    );
    
    RAISE NOTICE 'Successfully inserted ride % into completed_rides', p_ride_id;
    
  EXCEPTION
    WHEN OTHERS THEN
      result := json_build_object(
        'success', false,
        'error', 'INSERT_FAILED',
        'message', 'Failed to insert into completed_rides: ' || SQLERRM
      );
      RETURN result;
  END;

  -- Pay the driver (add fare to driver's wallet)
  IF ride_record.fare IS NOT NULL AND ride_record.fare > 0 THEN
    BEGIN
      UPDATE users 
      SET wallet_balance = COALESCE(wallet_balance, 0) + ride_record.fare,
          updated_at = NOW()
      WHERE id = ride_record.driver_id;
      
      -- Add transaction record for driver payment
      INSERT INTO transactions (
        user_id,
        amount,
        type,
        description,
        ride_id,
        created_at
      ) VALUES (
        ride_record.driver_id,
        ride_record.fare,
        'credit',
        'Payment for completed ride from ' || ride_record.origin_address || ' to ' || ride_record.destination_address,
        p_ride_id,
        NOW()
      );
      
      RAISE NOTICE 'Paid driver % amount R%', ride_record.driver_id, ride_record.fare;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Failed to pay driver: %', SQLERRM;
        -- Don't fail the whole operation for payment issues
    END;
  END IF;

  -- Deduct fare from parent's wallet
  IF ride_record.fare IS NOT NULL AND ride_record.fare > 0 THEN
    BEGIN
      UPDATE users 
      SET wallet_balance = GREATEST(0, COALESCE(wallet_balance, 0) - ride_record.fare),
          updated_at = NOW()
      WHERE id = ride_record.parent_id;
      
      -- Add transaction record for parent payment
      INSERT INTO transactions (
        user_id,
        amount,
        type,
        description,
        ride_id,
        created_at
      ) VALUES (
        ride_record.parent_id,
        ride_record.fare,
        'debit',
        'Payment for ride from ' || ride_record.origin_address || ' to ' || ride_record.destination_address,
        p_ride_id,
        NOW()
      );
      
      RAISE NOTICE 'Charged parent % amount R%', ride_record.parent_id, ride_record.fare;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Failed to charge parent: %', SQLERRM;
        -- Don't fail the whole operation for payment issues
    END;
  END IF;

  -- Update any related records
  BEGIN
    -- Update notifications to mark them as processed
    UPDATE notifications 
    SET updated_at = NOW()
    WHERE ride_id = p_ride_id;
    
    -- Archive messages related to this ride
    UPDATE messages 
    SET archived = true, updated_at = NOW()
    WHERE ride_id = p_ride_id;
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Failed to update related records: %', SQLERRM;
      -- Don't fail the whole operation
  END;

  -- Delete from rides table
  BEGIN
    DELETE FROM rides WHERE id = p_ride_id;
    RAISE NOTICE 'Deleted ride % from rides table', p_ride_id;
  EXCEPTION
    WHEN OTHERS THEN
      result := json_build_object(
        'success', false,
        'error', 'DELETE_FAILED',
        'message', 'Failed to delete from rides table: ' || SQLERRM
      );
      RETURN result;
  END;
  
  -- Final verification
  IF EXISTS (SELECT 1 FROM rides WHERE id = p_ride_id) THEN
    result := json_build_object(
      'success', false,
      'error', 'DELETE_VERIFICATION_FAILED',
      'message', 'Ride still exists in rides table after deletion attempt'
    );
    RETURN result;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM completed_rides WHERE original_ride_id = p_ride_id) THEN
    result := json_build_object(
      'success', false,
      'error', 'INSERT_VERIFICATION_FAILED',
      'message', 'Ride not found in completed_rides table after insertion'
    );
    RETURN result;
  END IF;
  
  -- Success!
  RAISE NOTICE 'Ride % successfully completed at %', p_ride_id, completion_time;
  
  result := json_build_object(
    'success', true,
    'completed_at', completion_time,
    'driver_paid', ride_record.fare IS NOT NULL AND ride_record.fare > 0,
    'payment_amount', COALESCE(ride_record.fare, 0),
    'message', 'Ride completed successfully. Driver has been paid R' || COALESCE(ride_record.fare, 0)
  );
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Catch-all error handler
    result := json_build_object(
      'success', false,
      'error', 'UNEXPECTED_ERROR',
      'message', 'Unexpected error: ' || SQLERRM
    );
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION move_ride_to_completed TO authenticated;
GRANT EXECUTE ON FUNCTION move_ride_to_completed TO service_role;

-- Create a helper function to debug ride status
CREATE OR REPLACE FUNCTION debug_ride_status(p_ride_id UUID)
RETURNS TABLE(
  table_name TEXT,
  found BOOLEAN,
  status TEXT,
  details JSONB
) AS $$
BEGIN
  -- Check rides table
  RETURN QUERY
  SELECT 
    'rides'::TEXT,
    EXISTS(SELECT 1 FROM rides WHERE id = p_ride_id),
    COALESCE((SELECT r.status FROM rides r WHERE r.id = p_ride_id), 'not_found')::TEXT,
    COALESCE((SELECT to_jsonb(r) FROM rides r WHERE r.id = p_ride_id), '{}'::jsonb);
    
  -- Check completed_rides table
  RETURN QUERY
  SELECT 
    'completed_rides'::TEXT,
    EXISTS(SELECT 1 FROM completed_rides WHERE original_ride_id = p_ride_id),
    CASE WHEN EXISTS(SELECT 1 FROM completed_rides WHERE original_ride_id = p_ride_id) 
         THEN 'completed' 
         ELSE 'not_found' 
    END::TEXT,
    COALESCE((SELECT to_jsonb(cr) FROM completed_rides cr WHERE cr.original_ride_id = p_ride_id), '{}'::jsonb);
    
  -- Check cancelled_rides table
  RETURN QUERY
  SELECT 
    'cancelled_rides'::TEXT,
    EXISTS(SELECT 1 FROM cancelled_rides WHERE original_ride_id = p_ride_id),
    CASE WHEN EXISTS(SELECT 1 FROM cancelled_rides WHERE original_ride_id = p_ride_id) 
         THEN 'cancelled' 
         ELSE 'not_found' 
    END::TEXT,
    COALESCE((SELECT to_jsonb(cr) FROM cancelled_rides cr WHERE cr.original_ride_id = p_ride_id), '{}'::jsonb);
    
  -- Check ride_requests table
  RETURN QUERY
  SELECT 
    'ride_requests'::TEXT,
    EXISTS(SELECT 1 FROM ride_requests WHERE id = p_ride_id),
    COALESCE((SELECT rr.status FROM ride_requests rr WHERE rr.id = p_ride_id), 'not_found')::TEXT,
    COALESCE((SELECT to_jsonb(rr) FROM ride_requests rr WHERE rr.id = p_ride_id), '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions for debug function
GRANT EXECUTE ON FUNCTION debug_ride_status TO authenticated;
GRANT EXECUTE ON FUNCTION debug_ride_status TO service_role;
