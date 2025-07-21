-- Fix the move_ride_back_to_requests function to handle missing notes field
DROP FUNCTION IF EXISTS move_ride_back_to_requests(UUID, TEXT);

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
  SELECT * INTO ride_record
  FROM rides
  WHERE id = p_ride_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ride not found';
  END IF;
  
  -- Check if ride request already exists
  SELECT EXISTS(
    SELECT 1 FROM ride_requests 
    WHERE id = ride_record.request_id OR id = p_ride_id
  ) INTO request_exists;
  
  IF request_exists THEN
    -- Update existing ride request
    UPDATE ride_requests
    SET 
      status = 'pending',
      notes = CONCAT('Re-posted after driver cancellation. Reason: ', p_cancellation_reason),
      updated_at = NOW()
    WHERE id = ride_record.request_id OR id = p_ride_id;
  ELSE
    -- Insert new ride request (without notes field initially, then update)
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
      'pending',
      NOW(),
      NOW()
    );
    
    -- Update with notes if the column exists
    BEGIN
      UPDATE ride_requests 
      SET notes = CONCAT('Re-posted after driver cancellation. Reason: ', p_cancellation_reason)
      WHERE id = COALESCE(ride_record.request_id, p_ride_id);
    EXCEPTION
      WHEN undefined_column THEN
        -- Notes column doesn't exist, skip this update
        NULL;
    END;
  END IF;
  
  -- Update any existing transactions to remove the ride_id foreign key reference
  UPDATE transactions 
  SET ride_id = NULL, 
      description = CONCAT(COALESCE(description, ''), ' (Original ride cancelled by driver)')
  WHERE ride_id = ride_record.id;
  
  -- Update any existing ratings to remove the ride_id foreign key reference
  UPDATE ratings 
  SET ride_id = NULL
  WHERE ride_id = ride_record.id;
  
  -- Update any existing messages to remove the ride_id foreign key reference
  UPDATE messages 
  SET ride_id = NULL
  WHERE ride_id = ride_record.id;
  
  -- Update any existing notifications to remove the ride_id foreign key reference
  UPDATE notifications 
  SET ride_id = NULL
  WHERE ride_id = ride_record.id;
  
  -- Now safely delete the ride from rides table
  DELETE FROM rides WHERE id = p_ride_id;
  
  RETURN TRUE;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to move ride back to requests: %', SQLERRM;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION move_ride_back_to_requests(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION move_ride_back_to_requests(UUID, TEXT) TO service_role;
