-- Function to move a ride back to ride_requests table
CREATE OR REPLACE FUNCTION move_ride_back_to_requests(
  ride_id UUID,
  cancellation_reason TEXT DEFAULT 'No reason provided'
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
  WHERE id = ride_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ride not found';
  END IF;
  
  -- Check if ride request already exists
  SELECT EXISTS(
    SELECT 1 FROM ride_requests 
    WHERE id = ride_record.request_id OR id = ride_id
  ) INTO request_exists;
  
  IF request_exists THEN
    -- Update existing ride request
    UPDATE ride_requests
    SET 
      status = 'pending',
      notes = CONCAT('Re-posted after cancellation. Original reason: ', cancellation_reason),
      updated_at = NOW()
    WHERE id = ride_record.request_id OR id = ride_id;
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
      COALESCE(ride_record.request_id, ride_id),
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
      CONCAT('Re-posted after cancellation. Original reason: ', cancellation_reason),
      'pending',
      NOW(),
      NOW()
    );
  END IF;
  
  -- Delete the ride from rides table
  DELETE FROM rides WHERE id = ride_id;
  
  RETURN TRUE;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to move ride back to requests: %', SQLERRM;
END;
$$;
