-- Drop the existing function first
DROP FUNCTION IF EXISTS move_ride_to_cancelled(UUID, UUID, TEXT, NUMERIC);

-- Recreate the function with proper parameter names
CREATE OR REPLACE FUNCTION move_ride_to_cancelled(
  p_ride_id UUID,
  p_cancelled_by_user_id UUID,
  p_cancellation_reason TEXT DEFAULT 'No reason provided',
  p_fine_amount NUMERIC DEFAULT 0
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  ride_record RECORD;
BEGIN
  -- Get the ride data with row locking
  SELECT r.* INTO ride_record
  FROM rides r
  WHERE r.id = p_ride_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ride not found with id: %', p_ride_id;
  END IF;
  
  -- Verify the user is authorized to cancel (either parent or driver)
  IF ride_record.parent_id != p_cancelled_by_user_id AND ride_record.driver_id != p_cancelled_by_user_id THEN
    RAISE EXCEPTION 'User % is not authorized to cancel ride %', p_cancelled_by_user_id, p_ride_id;
  END IF;
  
  -- Insert into cancelled_rides table
  INSERT INTO cancelled_rides (
    original_ride_id,
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
    current_location_lat,
    current_location_lng,
    current_location_address,
    estimated_arrival,
    cancelled_at,
    cancelled_by,
    cancellation_reason,
    fine_amount,
    created_at,
    updated_at
  ) VALUES (
    ride_record.id,
    ride_record.parent_id,
    ride_record.child_id,
    ride_record.driver_id,
    ride_record.origin_address,
    ride_record.origin_lat,
    ride_record.origin_lng,
    ride_record.destination_address,
    ride_record.destination_lat,
    ride_record.destination_lng,
    ride_record.destination_name,
    ride_record.scheduled_time,
    ride_record.fare,
    ride_record.otp,
    ride_record.otp_generated_at,
    ride_record.current_location_lat,
    ride_record.current_location_lng,
    ride_record.current_location_address,
    ride_record.estimated_arrival,
    NOW(),
    p_cancelled_by_user_id,
    p_cancellation_reason,
    p_fine_amount,
    ride_record.created_at,
    NOW()
  );
  
  -- Update any existing transactions to remove the ride_id foreign key reference
  UPDATE transactions t
  SET 
    ride_id = NULL, 
    description = CONCAT(COALESCE(t.description, ''), ' (Original ride cancelled)')
  WHERE t.ride_id = p_ride_id;
  
  -- Update any existing ratings to remove the ride_id foreign key reference
  UPDATE ratings rt
  SET ride_id = NULL
  WHERE rt.ride_id = p_ride_id;
  
  -- Update any existing messages to remove the ride_id foreign key reference
  UPDATE messages m
  SET ride_id = NULL
  WHERE m.ride_id = p_ride_id;
  
  -- Update any existing notifications to remove the ride_id foreign key reference
  UPDATE notifications n
  SET ride_id = NULL
  WHERE n.ride_id = p_ride_id;
  
  -- Now safely delete the ride from rides table
  DELETE FROM rides r WHERE r.id = p_ride_id;
  
  RETURN TRUE;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to cancel ride: %', SQLERRM;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION move_ride_to_cancelled(UUID, UUID, TEXT, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION move_ride_to_cancelled(UUID, UUID, TEXT, NUMERIC) TO service_role;
