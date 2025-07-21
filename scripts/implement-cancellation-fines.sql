-- Create function to calculate cancellation fine
CREATE OR REPLACE FUNCTION calculate_cancellation_fine(
  p_ride_id UUID,
  p_cancelled_by_user_id UUID
)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
AS $$
DECLARE
  ride_record RECORD;
  fine_amount DECIMAL(10,2) := 0.00;
  is_parent_cancelling BOOLEAN := FALSE;
  is_after_acceptance BOOLEAN := FALSE;
BEGIN
  -- Get ride data
  SELECT * INTO ride_record FROM rides WHERE id = p_ride_id;
  
  IF NOT FOUND THEN
    RETURN 0.00;
  END IF;
  
  -- Check if parent is cancelling
  is_parent_cancelling := (ride_record.parent_id = p_cancelled_by_user_id);
  
  -- Check if ride was accepted (has driver assigned)
  is_after_acceptance := (ride_record.driver_id IS NOT NULL);
  
  -- Apply fine logic:
  -- 1. Parent can cancel before driver accepts - no fine
  -- 2. Parent cancels after driver accepts - 10% fine
  -- 3. Driver cancels - no fine to parent
  IF is_parent_cancelling AND is_after_acceptance THEN
    fine_amount := ROUND((ride_record.fare * 0.10), 2);
  END IF;
  
  RETURN fine_amount;
END;
$$;

-- Update the move_ride_to_cancelled function to use the fine calculation
CREATE OR REPLACE FUNCTION move_ride_to_cancelled(
  p_ride_id UUID,
  p_cancelled_by_user_id UUID,
  p_cancellation_reason TEXT DEFAULT 'No reason provided',
  p_fine_amount DECIMAL(10,2) DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  ride_record RECORD;
  calculated_fine DECIMAL(10,2);
  final_fine DECIMAL(10,2);
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
  
  -- Calculate fine if not provided
  IF p_fine_amount IS NULL THEN
    calculated_fine := calculate_cancellation_fine(p_ride_id, p_cancelled_by_user_id);
  ELSE
    calculated_fine := p_fine_amount;
  END IF;
  
  final_fine := COALESCE(calculated_fine, 0.00);
  
  -- Apply fine if applicable
  IF final_fine > 0 THEN
    -- Deduct from parent's wallet
    UPDATE users 
    SET wallet_balance = GREATEST(0, COALESCE(wallet_balance, 0) - final_fine)
    WHERE id = ride_record.parent_id;
    
    -- Add to driver's wallet
    UPDATE users 
    SET wallet_balance = COALESCE(wallet_balance, 0) + final_fine
    WHERE id = ride_record.driver_id;
    
    -- Create transaction records
    INSERT INTO transactions (user_id, amount, type, description, ride_id) VALUES
    (ride_record.parent_id, final_fine, 'debit', 'Cancellation fine (10% of ride fare)', p_ride_id),
    (ride_record.driver_id, final_fine, 'credit', 'Cancellation compensation', p_ride_id);
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
    cancellation_fine,
    fine_applied,
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
    final_fine,
    CASE WHEN final_fine > 0 THEN TRUE ELSE FALSE END,
    ride_record.created_at,
    NOW()
  );
  
  -- Update any existing transactions to remove the ride_id foreign key reference
  UPDATE transactions t
  SET 
    ride_id = NULL, 
    description = CONCAT(COALESCE(t.description, ''), ' (Original ride cancelled)')
  WHERE t.ride_id = p_ride_id AND t.description NOT LIKE '%Cancellation%';
  
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION calculate_cancellation_fine(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION move_ride_to_cancelled(UUID, UUID, TEXT, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION move_ride_to_cancelled(UUID, UUID, TEXT, DECIMAL) TO service_role;
