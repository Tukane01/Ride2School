-- Fix driver cancellation to apply 10% fine and move ride back to requests

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS move_ride_back_to_requests(UUID, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS move_ride_back_to_requests(UUID, TEXT);
DROP FUNCTION IF EXISTS move_ride_back_to_requests(UUID);

-- Create enhanced function for driver cancellations with mandatory 10% fine
CREATE OR REPLACE FUNCTION move_ride_back_to_requests(
  p_ride_id UUID,
  p_cancellation_reason TEXT DEFAULT 'Cancelled by driver'
)
RETURNS JSON AS $$
DECLARE
  ride_record RECORD;
  calculated_fine DECIMAL(10, 2) := 0.00;
  driver_balance DECIMAL(10, 2) := 0.00;
  result JSON;
BEGIN
  -- Get the ride data with locking
  SELECT * INTO ride_record 
  FROM rides 
  WHERE id = p_ride_id 
  FOR UPDATE NOWAIT;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ride not found with ID: %', p_ride_id;
  END IF;
  
  -- Calculate 10% fine of ride fare (mandatory for driver cancellations)
  calculated_fine := COALESCE(ride_record.fare * 0.10, 0.00);
  
  -- Get driver's current wallet balance
  SELECT wallet_balance INTO driver_balance 
  FROM users 
  WHERE id = ride_record.driver_id;
  
  driver_balance := COALESCE(driver_balance, 0.00);
  
  -- Apply the fine to the driver's wallet (can go negative)
  UPDATE users 
  SET wallet_balance = wallet_balance - calculated_fine,
      updated_at = NOW()
  WHERE id = ride_record.driver_id;
  
  -- Add transaction record for the fine
  INSERT INTO transactions (
    user_id,
    amount,
    type,
    description,
    ride_id,
    created_at
  ) VALUES (
    ride_record.driver_id,
    calculated_fine,
    'debit',
    'Driver cancellation fine (10% of ride fare): ' || p_cancellation_reason,
    p_ride_id,
    NOW()
  );
  
  -- Insert the request back into ride_requests table with pending status
  INSERT INTO ride_requests (
    id,
    parent_id,
    child_id,
    origin_address,
    origin_lat,
    origin_lng,
    destination_address,
    destination_lat,
    destination_lng,
    destination_name,
    scheduled_time,
    estimated_fare,
    status,
    notes,
    created_at,
    updated_at
  ) VALUES (
    COALESCE(ride_record.request_id, gen_random_uuid()),
    ride_record.parent_id,
    ride_record.child_id,
    ride_record.origin_address,
    ride_record.origin_lat,
    ride_record.origin_lng,
    ride_record.destination_address,
    ride_record.destination_lat,
    ride_record.destination_lng,
    ride_record.destination_name,
    ride_record.scheduled_time,
    ride_record.fare,
    'pending',
    'Re-available after driver cancellation: ' || p_cancellation_reason,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    status = 'pending',
    notes = 'Re-available after driver cancellation: ' || p_cancellation_reason,
    updated_at = NOW();
  
  -- Create notification for parent about driver cancellation
  INSERT INTO notifications (
    user_id,
    title,
    content,
    type,
    ride_id,
    created_at
  ) VALUES (
    ride_record.parent_id,
    'Driver Cancelled Ride',
    'Your ride has been cancelled by the driver. The ride is now available for other drivers to accept. Driver reason: ' || p_cancellation_reason,
    'ride_cancelled_by_driver',
    p_ride_id,
    NOW()
  );
  
  -- Delete from rides table
  DELETE FROM rides WHERE id = p_ride_id;
  
  -- Return detailed result
  result := json_build_object(
    'success', true,
    'action', 'moved_to_requests',
    'fine_applied', true,
    'fine_amount', calculated_fine,
    'driver_balance_before', driver_balance,
    'driver_balance_after', driver_balance - calculated_fine,
    'ride_available_for_reassignment', true,
    'message', 'Driver cancelled ride. Fine of R' || calculated_fine || ' applied. Ride moved back to requests for reassignment.'
  );
  
  RETURN result;
  
EXCEPTION
  WHEN lock_not_available THEN
    RAISE EXCEPTION 'Ride % is currently being processed. Please try again.', p_ride_id;
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error processing driver cancellation for ride %: %', p_ride_id, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION move_ride_back_to_requests TO authenticated;
GRANT EXECUTE ON FUNCTION move_ride_back_to_requests TO service_role;
