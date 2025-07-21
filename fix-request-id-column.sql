-- Check if request_id column exists in rides table, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'rides' AND column_name = 'request_id'
  ) THEN
    ALTER TABLE rides ADD COLUMN request_id UUID REFERENCES ride_requests(id);
  END IF;
END $$;

-- Create a function to create a ride without relying on schema cache
CREATE OR REPLACE FUNCTION create_ride_from_request(
  p_request_id UUID,
  p_parent_id UUID,
  p_child_id UUID,
  p_driver_id UUID,
  p_origin_lat DECIMAL,
  p_origin_lng DECIMAL,
  p_origin_address TEXT,
  p_destination_lat DECIMAL,
  p_destination_lng DECIMAL,
  p_destination_address TEXT,
  p_destination_name TEXT,
  p_scheduled_time TIMESTAMP WITH TIME ZONE,
  p_fare DECIMAL,
  p_otp TEXT,
  p_estimated_arrival TIMESTAMP WITH TIME ZONE
) RETURNS UUID AS $$
DECLARE
  v_ride_id UUID;
BEGIN
  INSERT INTO rides (
    request_id,
    parent_id,
    child_id,
    driver_id,
    origin_lat,
    origin_lng,
    origin_address,
    destination_lat,
    destination_lng,
    destination_address,
    destination_name,
    scheduled_time,
    status,
    fare,
    current_location_lat,
    current_location_lng,
    current_location_address,
    estimated_arrival,
    otp,
    otp_generated_at,
    created_at
  ) VALUES (
    p_request_id,
    p_parent_id,
    p_child_id,
    p_driver_id,
    p_origin_lat,
    p_origin_lng,
    p_origin_address,
    p_destination_lat,
    p_destination_lng,
    p_destination_address,
    p_destination_name,
    p_scheduled_time,
    'scheduled',
    p_fare,
    p_origin_lat,
    p_origin_lng,
    p_origin_address,
    p_estimated_arrival,
    p_otp,
    NOW(),
    NOW()
  ) RETURNING id INTO v_ride_id;
  
  RETURN v_ride_id;
END;
$$ LANGUAGE plpgsql;
