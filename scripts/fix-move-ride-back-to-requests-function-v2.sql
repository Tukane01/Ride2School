-- Drop the existing function first
DROP FUNCTION IF EXISTS move_ride_back_to_requests(UUID, TEXT);

-- Recreate the function with proper table aliases to avoid ambiguous column references
CREATE OR REPLACE FUNCTION move_ride_back_to_requests(
  p_ride_id UUID,
  p_cancellation_reason TEXT DEFAULT 'No reason provided'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  ride_record RECORD;
  request_exists BOOLEAN;
BEGIN
  -- Get the ride data
  SELECT r.* INTO ride_record
  FROM rides r
  WHERE r.id = p_ride_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ride not found with id: %', p_ride_id;
  END IF;
  
  -- Check if ride request already exists
  SELECT EXISTS(
    SELECT 1 FROM ride_requests rr
    WHERE rr.id = ride_record.request_id OR rr.id = p_ride_id
  ) INTO request_exists;
  
  IF request_exists THEN
    -- Update existing ride request
    UPDATE ride_requests
    SET 
      status = 'pending',
      notes = CONCAT(COALESCE(notes, ''), ' Re-posted after cancellation. Original reason: ', p_cancellation_reason),
      updated_at = NOW()
    WHERE id = ride_record.request_id OR id = p_ride_id;
  ELSE
    -- Insert new ride request
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
      notes,
      status,
      created_at,
      updated_at
    ) VALUES (
      COALESCE(ride_record.request_id, p_ride_id),
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
      CONCAT('Re-posted after cancellation. Original reason: ', p_cancellation_reason),
      'pending',
      NOW(),
      NOW()
    );
  END IF;
  
  -- Update any existing transactions to remove the ride_id foreign key reference
  -- Use table alias to avoid ambiguous column references
  UPDATE transactions t
  SET 
    ride_id = NULL, 
    description = CONCAT(COALESCE(t.description, ''), ' (Original ride cancelled by driver)')
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
    RAISE EXCEPTION 'Failed to move ride back to requests: %', SQLERRM;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION move_ride_back_to_requests(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION move_ride_back_to_requests(UUID, TEXT) TO service_role;
