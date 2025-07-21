-- Check if the rides table exists and add the request_id column if it doesn't exist
DO $$
BEGIN
  -- Check if rides table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'rides') THEN
    -- Check for request_id column
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'rides' AND column_name = 'request_id'
    ) THEN
      ALTER TABLE rides ADD COLUMN request_id UUID REFERENCES ride_requests(id);
    END IF;
  END IF;
END $$;

-- Create a function to accept a ride request that works around schema cache issues
CREATE OR REPLACE FUNCTION accept_ride_request(
  p_request_id UUID,
  p_driver_id UUID,
  p_otp TEXT,
  p_otp_generated_at TIMESTAMP WITH TIME ZONE
) RETURNS UUID AS $$
DECLARE
  v_ride_id UUID;
  v_request RECORD;
BEGIN
  -- Get the ride request details
  SELECT * INTO v_request FROM ride_requests WHERE id = p_request_id;
  
  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Ride request not found';
  END IF;
  
  -- Update the request status
  UPDATE ride_requests SET status = 'accepted' WHERE id = p_request_id AND status = 'pending';
  
  -- Insert the new ride
  INSERT INTO rides (
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
    created_at,
    request_id
  ) VALUES (
    v_request.parent_id,
    v_request.child_id,
    p_driver_id,
    v_request.origin_lat,
    v_request.origin_lng,
    v_request.origin_address,
    v_request.destination_lat,
    v_request.destination_lng,
    v_request.destination_address,
    v_request.destination_name,
    v_request.scheduled_time,
    'scheduled',
    v_request.estimated_fare,
    v_request.origin_lat,
    v_request.origin_lng,
    v_request.origin_address,
    (NOW() + INTERVAL '15 minutes'),
    p_otp,
    p_otp_generated_at,
    NOW(),
    p_request_id
  ) RETURNING id INTO v_ride_id;
  
  RETURN v_ride_id;
END;
$$ LANGUAGE plpgsql;
