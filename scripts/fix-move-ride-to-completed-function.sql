-- Drop existing functions to avoid ambiguity
DROP FUNCTION IF EXISTS move_ride_to_completed(uuid, timestamp with time zone, timestamp with time zone, numeric, integer);
DROP FUNCTION IF EXISTS move_ride_to_completed(uuid, timestamp without time zone, timestamp without time zone, numeric, integer);

-- Create a single, clear function
CREATE OR REPLACE FUNCTION move_ride_to_completed(
  ride_id UUID,
  actual_pickup_time TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  actual_dropoff_time TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  distance_traveled NUMERIC DEFAULT NULL,
  duration_minutes INTEGER DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  ride_record RECORD;
BEGIN
  -- Get the ride data first
  SELECT * INTO ride_record FROM rides WHERE id = ride_id;
  
  -- Check if ride exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ride with ID % not found', ride_id;
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
    request_id
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
    COALESCE(actual_dropoff_time, NOW()),
    actual_pickup_time,
    actual_dropoff_time,
    distance_traveled,
    duration_minutes,
    ride_record.fare,
    ride_record.otp,
    ride_record.otp_generated_at,
    ride_record.current_location_lat,
    ride_record.current_location_lng,
    ride_record.current_location_address,
    ride_record.estimated_arrival,
    ride_record.request_id
  );

  -- Delete from rides table
  DELETE FROM rides WHERE id = ride_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
