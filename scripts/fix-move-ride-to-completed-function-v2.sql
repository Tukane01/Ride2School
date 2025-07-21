-- Drop existing function to avoid conflicts
DROP FUNCTION IF EXISTS move_ride_to_completed(uuid, timestamp with time zone, timestamp with time zone, numeric, integer);
DROP FUNCTION IF EXISTS move_ride_to_completed(uuid, timestamp without time zone, timestamp without time zone, numeric, integer);
DROP FUNCTION IF EXISTS move_ride_to_completed(uuid);

-- Create a more robust function to move ride to completed
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
  -- Set completion time
  completion_time := COALESCE(p_actual_dropoff_time, NOW());
  
  -- First check if this ride already exists in completed_rides table
  SELECT * INTO existing_completed_ride 
  FROM completed_rides 
  WHERE original_ride_id = p_ride_id;
  
  IF FOUND THEN
    RAISE NOTICE 'Ride % already exists in completed_rides table', p_ride_id;
    
    -- Delete from rides table if it still exists there
    DELETE FROM rides WHERE id = p_ride_id;
    
    result := json_build_object(
      'success', true,
      'already_completed', true,
      'message', 'Ride was already completed at ' || existing_completed_ride.completed_at
    );
    
    RETURN result;
  END IF;
  
  -- Get the ride data with explicit locking to prevent race conditions
  SELECT * INTO ride_record 
  FROM rides 
  WHERE id = p_ride_id 
  FOR UPDATE NOWAIT;
  
  -- Check if ride exists
  IF NOT FOUND THEN
    -- Check if ride exists in completed_rides table (might have been moved already)
    SELECT * INTO existing_completed_ride 
    FROM completed_rides 
    WHERE original_ride_id = p_ride_id;
    
    IF FOUND THEN
      RAISE NOTICE 'Ride % was already completed at %', p_ride_id, existing_completed_ride.completed_at;
      result := json_build_object(
        'success', true,
        'already_completed', true,
        'message', 'Ride was already completed at ' || existing_completed_ride.completed_at
      );
      RETURN result;
    END IF;
    
    -- Check if ride exists in cancelled_rides table
    IF EXISTS (SELECT 1 FROM cancelled_rides WHERE original_ride_id = p_ride_id) THEN
      RAISE EXCEPTION 'Ride with ID % was already cancelled and cannot be completed', p_ride_id;
    END IF;
    
    RAISE EXCEPTION 'Ride with ID % not found in any table', p_ride_id;
  END IF;
  
  -- Check if ride is in a completable state
  IF ride_record.status NOT IN ('scheduled', 'in_progress') THEN
    RAISE EXCEPTION 'Ride with ID % cannot be completed. Current status: %', p_ride_id, ride_record.status;
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

  -- Pay the driver (add fare to driver's wallet)
  IF ride_record.fare IS NOT NULL AND ride_record.fare > 0 THEN
    UPDATE users 
    SET wallet_balance = COALESCE(wallet_balance, 0) + ride_record.fare
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
      'Payment for completed ride',
      p_ride_id,
      NOW()
    );
  END IF;

  -- Update any related records to reference the completed ride
  -- Update transactions to add completion note (only if not already updated)
  UPDATE transactions 
  SET description = COALESCE(description, '') || ' (Completed on ' || completion_time::date || ')'
  WHERE ride_id = p_ride_id 
  AND description NOT LIKE '%(Completed on%';

  -- Update notifications to mark them as processed
  UPDATE notifications 
  SET updated_at = NOW()
  WHERE ride_id = p_ride_id;

  -- Delete from rides table
  DELETE FROM rides WHERE id = p_ride_id;
  
  -- Verify the ride was actually deleted and added to completed_rides
  IF EXISTS (SELECT 1 FROM rides WHERE id = p_ride_id) THEN
    RAISE EXCEPTION 'Failed to delete ride % from rides table', p_ride_id;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM completed_rides WHERE original_ride_id = p_ride_id) THEN
    RAISE EXCEPTION 'Failed to insert ride % into completed_rides table', p_ride_id;
  END IF;
  
  -- Log successful completion
  RAISE NOTICE 'Ride % successfully moved to completed_rides at %', p_ride_id, completion_time;
  
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
    RAISE EXCEPTION 'Ride % is currently being processed by another operation. Please try again.', p_ride_id;
  WHEN OTHERS THEN
    -- Log the error for debugging
    RAISE EXCEPTION 'Error moving ride % to completed: %', p_ride_id, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION move_ride_to_completed TO authenticated;
GRANT EXECUTE ON FUNCTION move_ride_to_completed TO service_role;

-- Also create a function to safely check ride status before completing
CREATE OR REPLACE FUNCTION check_ride_status(p_ride_id UUID)
RETURNS TABLE(
  status TEXT,
  location TEXT,
  message TEXT
) AS $$
BEGIN
  -- Check if ride exists in rides table
  IF EXISTS (SELECT 1 FROM rides WHERE id = p_ride_id) THEN
    RETURN QUERY 
    SELECT 
      r.status::TEXT,
      'rides'::TEXT as location,
      'Ride found in active rides table'::TEXT as message
    FROM rides r 
    WHERE r.id = p_ride_id;
    RETURN;
  END IF;
  
  -- Check if ride exists in completed_rides table
  IF EXISTS (SELECT 1 FROM completed_rides WHERE original_ride_id = p_ride_id) THEN
    RETURN QUERY 
    SELECT 
      'completed'::TEXT as status,
      'completed_rides'::TEXT as location,
      ('Ride already completed at ' || completed_at::TEXT)::TEXT as message
    FROM completed_rides 
    WHERE original_ride_id = p_ride_id;
    RETURN;
  END IF;
  
  -- Check if ride exists in cancelled_rides table
  IF EXISTS (SELECT 1 FROM cancelled_rides WHERE original_ride_id = p_ride_id) THEN
    RETURN QUERY 
    SELECT 
      'cancelled'::TEXT as status,
      'cancelled_rides'::TEXT as location,
      ('Ride was cancelled at ' || cancelled_at::TEXT)::TEXT as message
    FROM cancelled_rides 
    WHERE original_ride_id = p_ride_id;
    RETURN;
  END IF;
  
  -- Ride not found anywhere
  RETURN QUERY 
  SELECT 
    'not_found'::TEXT as status,
    'nowhere'::TEXT as location,
    'Ride not found in any table'::TEXT as message;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions for the check function
GRANT EXECUTE ON FUNCTION check_ride_status TO authenticated;
GRANT EXECUTE ON FUNCTION check_ride_status TO service_role;
