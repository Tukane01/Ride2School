-- Create or replace function to update ride location
CREATE OR REPLACE FUNCTION update_ride_location(
  p_ride_id UUID,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_address TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Update the ride location
  UPDATE rides
  SET 
    current_location_lat = p_lat,
    current_location_lng = p_lng,
    current_location_address = COALESCE(p_address, current_location_address),
    updated_at = NOW()
  WHERE id = p_ride_id;
  
  -- Notify on the ride_updates channel that a location has changed
  PERFORM pg_notify(
    'ride_location_update',
    json_build_object(
      'ride_id', p_ride_id,
      'lat', p_lat,
      'lng', p_lng,
      'timestamp', NOW()
    )::text
  );
END;
$$ LANGUAGE plpgsql;
