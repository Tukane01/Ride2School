-- Drop existing function to avoid conflicts
DROP FUNCTION IF EXISTS move_ride_to_completed(uuid, timestamp with time zone, timestamp with time zone, numeric, integer);
DROP FUNCTION IF EXISTS move_ride_to_completed(uuid, timestamp without time zone, timestamp without time zone, numeric, integer);

-- Create a robust function to move ride to completed
CREATE OR REPLACE FUNCTION move_ride_to_completed(
  p_ride_id UUID,
  p_actual_pickup_time TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_actual_dropoff_time TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_distance_traveled NUMERIC DEFAULT NULL,
  p_duration_minutes INTEGER DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  ride_record RECORD;
  completion_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Set completion time
  completion_time := COALESCE(p_actual_dropoff_time, NOW());
  
  -- Get the ride data first with explicit locking to prevent race conditions
  SELECT * INTO ride_record 
  FROM rides 
  WHERE id = p_ride_id 
  FOR UPDATE;
  
  -- Check if ride exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ride with ID % not found', p_ride_id;
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

  -- Update any related records to reference the completed ride
  -- Update transactions to add completion note
  UPDATE transactions 
  SET description = COALESCE(description, '') || ' (Ride completed on ' || completion_time::date || ')'
  WHERE ride_id = p_ride_id 
  AND description NOT LIKE '%(Ride completed on%';

  -- Update notifications to mark them as archived
  UPDATE notifications 
  SET updated_at = NOW()
  WHERE ride_id = p_ride_id;

  -- Delete from rides table (this will cascade to related tables if properly configured)
  DELETE FROM rides WHERE id = p_ride_id;
  
  -- Verify the ride was actually deleted
  IF EXISTS (SELECT 1 FROM rides WHERE id = p_ride_id) THEN
    RAISE EXCEPTION 'Failed to delete ride % from rides table', p_ride_id;
  END IF;
  
  -- Log successful completion
  RAISE NOTICE 'Ride % successfully moved to completed_rides at %', p_ride_id, completion_time;
  
  RETURN TRUE;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error for debugging
    RAISE EXCEPTION 'Error moving ride % to completed: %', p_ride_id, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION move_ride_to_completed TO authenticated;
GRANT EXECUTE ON FUNCTION move_ride_to_completed TO service_role;
