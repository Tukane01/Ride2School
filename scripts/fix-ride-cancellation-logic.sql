-- Drop and recreate the move_ride_back_to_requests function to fix driver cancellation logic
DROP FUNCTION IF EXISTS move_ride_back_to_requests(UUID, TEXT);

CREATE OR REPLACE FUNCTION move_ride_back_to_requests(
  p_ride_id UUID,
  p_cancellation_reason TEXT DEFAULT 'Cancelled by driver'
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
  
  -- Insert back into ride_requests table with pending status
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
    ride_record.request_id, -- Use original request ID
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
    CONCAT(COALESCE(ride_record.notes, ''), ' (Re-posted after driver cancellation: ', p_cancellation_reason, ')'),
    'pending',
    ride_record.created_at,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    status = 'pending',
    notes = CONCAT(COALESCE(ride_requests.notes, ''), ' (Re-posted after driver cancellation: ', p_cancellation_reason, ')'),
    updated_at = NOW();
  
  -- Update any existing transactions to remove the ride_id foreign key reference
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

-- Create function to check if parent can cancel without penalty
CREATE OR REPLACE FUNCTION can_parent_cancel_without_penalty(p_ride_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  ride_status TEXT;
BEGIN
  SELECT status INTO ride_status
  FROM rides
  WHERE id = p_ride_id;
  
  -- Parent can cancel without penalty if ride is only scheduled (not in progress)
  RETURN (ride_status = 'scheduled');
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION can_parent_cancel_without_penalty(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_parent_cancel_without_penalty(UUID) TO service_role;
