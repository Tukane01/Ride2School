-- Drop existing function and create enhanced version
DROP FUNCTION IF EXISTS move_ride_to_completed(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, NUMERIC, INTEGER);
DROP FUNCTION IF EXISTS move_ride_to_completed(UUID);

-- Create comprehensive move_ride_to_completed function
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
  driver_balance DECIMAL(10, 2) := 0.00;
  parent_balance DECIMAL(10, 2) := 0.00;
  result JSON;
BEGIN
  -- Set completion time
  completion_time := COALESCE(p_actual_dropoff_time, NOW());
  
  -- Check if ride already exists in completed_rides table
  SELECT * INTO existing_completed_ride 
  FROM completed_rides 
  WHERE original_ride_id = p_ride_id;
  
  IF FOUND THEN
    -- Delete from rides table if it still exists
    DELETE FROM rides WHERE id = p_ride_id;
    
    result := json_build_object(
      'success', true,
      'already_completed', true,
      'completed_at', existing_completed_ride.completed_at,
      'message', 'Ride was already completed at ' || existing_completed_ride.completed_at
    );
    
    RETURN result;
  END IF;
  
  -- Get the ride data with locking
  SELECT * INTO ride_record 
  FROM rides 
  WHERE id = p_ride_id 
  FOR UPDATE NOWAIT;
  
  -- Check if ride exists
  IF NOT FOUND THEN
    -- Check other tables for debugging
    IF EXISTS (SELECT 1 FROM cancelled_rides WHERE original_ride_id = p_ride_id) THEN
      RAISE EXCEPTION 'Ride % was already cancelled and cannot be completed', p_ride_id;
    END IF;
    
    RAISE EXCEPTION 'Ride % not found in active rides table', p_ride_id;
  END IF;
  
  -- Validate ride status
  IF ride_record.status NOT IN ('scheduled', 'in_progress') THEN
    RAISE EXCEPTION 'Ride % cannot be completed. Current status: %', p_ride_id, ride_record.status;
  END IF;
  
  -- Validate required data
  IF ride_record.fare IS NULL OR ride_record.fare <= 0 THEN
    RAISE EXCEPTION 'Ride % has invalid fare amount: %', p_ride_id, ride_record.fare;
  END IF;
  
  -- Get current wallet balances
  SELECT wallet_balance INTO driver_balance 
  FROM users WHERE id = ride_record.driver_id;
  
  SELECT wallet_balance INTO parent_balance 
  FROM users WHERE id = ride_record.parent_id;
  
  driver_balance := COALESCE(driver_balance, 0.00);
  parent_balance := COALESCE(parent_balance, 0.00);
  
  -- Pay the driver (add fare to driver's wallet)
  UPDATE users 
  SET wallet_balance = wallet_balance + ride_record.fare,
      updated_at = NOW()
  WHERE id = ride_record.driver_id;
  
  -- Deduct fare from parent's wallet (can go negative if insufficient funds)
  UPDATE users 
  SET wallet_balance = wallet_balance - ride_record.fare,
      updated_at = NOW()
  WHERE id = ride_record.parent_id;
  
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
    'Payment for completed ride: ' || ride_record.origin_address || ' to ' || ride_record.destination_address,
    p_ride_id,
    NOW()
  );
  
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
    'Payment for completed ride: ' || ride_record.origin_address || ' to ' || ride_record.destination_address,
    p_ride_id,
    NOW()
  );
  
  -- Insert into completed_rides table with all data from active ride
  INSERT INTO completed_rides (
    original_ride_id,
    request_id,
    parent_id,
    driver_id,
    child_id,
    origin_address,
    origin_lat,
    origin_lng,
    destination_address,
    destination_lat,
    destination_lng,
    destination_name,
    current_location_lat,
    current_location_lng,
    current_location_address,
    scheduled_time,
    completed_at,
    actual_pickup_time,
    actual_dropoff_time,
    fare,
    distance_traveled,
    duration_minutes,
    otp,
    otp_generated_at,
    estimated_arrival,
    created_at,
    updated_at
  ) VALUES (
    ride_record.id,
    ride_record.request_id,
    ride_record.parent_id,
    ride_record.driver_id,
    ride_record.child_id,
    ride_record.origin_address,
    ride_record.origin_lat,
    ride_record.origin_lng,
    ride_record.destination_address,
    ride_record.destination_lat,
    ride_record.destination_lng,
    ride_record.destination_name,
    COALESCE(ride_record.current_location_lat, ride_record.destination_lat),
    COALESCE(ride_record.current_location_lng, ride_record.destination_lng),
    COALESCE(ride_record.current_location_address, ride_record.destination_address),
    ride_record.scheduled_time,
    completion_time,
    COALESCE(p_actual_pickup_time, ride_record.scheduled_time),
    completion_time,
    ride_record.fare,
    p_distance_traveled,
    p_duration_minutes,
    ride_record.otp,
    ride_record.otp_generated_at,
    ride_record.estimated_arrival,
    ride_record.created_at,
    NOW()
  );
  
  -- Create completion notification for parent
  INSERT INTO notifications (
    user_id,
    title,
    content,
    type,
    ride_id,
    created_at
  ) VALUES (
    ride_record.parent_id,
    'Ride Completed',
    'Your child''s ride has been completed successfully. Amount charged: R' || ride_record.fare,
    'ride_completed',
    p_ride_id,
    NOW()
  );
  
  -- Archive related messages
  UPDATE messages 
  SET archived = true, updated_at = NOW()
  WHERE ride_id = p_ride_id;
  
  -- Delete from active rides table
  DELETE FROM rides WHERE id = p_ride_id;
  
  -- Verify completion
  IF EXISTS (SELECT 1 FROM rides WHERE id = p_ride_id) THEN
    RAISE EXCEPTION 'Failed to remove ride % from active rides table', p_ride_id;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM completed_rides WHERE original_ride_id = p_ride_id) THEN
    RAISE EXCEPTION 'Failed to insert ride % into completed rides table', p_ride_id;
  END IF;
  
  -- Return success result
  result := json_build_object(
    'success', true,
    'completed_at', completion_time,
    'driver_paid', true,
    'payment_amount', ride_record.fare,
    'driver_balance_before', driver_balance,
    'driver_balance_after', driver_balance + ride_record.fare,
    'parent_balance_before', parent_balance,
    'parent_balance_after', parent_balance - ride_record.fare,
    'ride_archived', true,
    'message', 'Ride completed successfully. Driver paid R' || ride_record.fare || '. Parent charged R' || ride_record.fare
  );
  
  RETURN result;
  
EXCEPTION
  WHEN lock_not_available THEN
    RAISE EXCEPTION 'Ride % is currently being processed. Please try again.', p_ride_id;
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error completing ride %: %', p_ride_id, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION move_ride_to_completed TO authenticated;
GRANT EXECUTE ON FUNCTION move_ride_to_completed TO service_role;
