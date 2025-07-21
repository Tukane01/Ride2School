-- Check if request_id column exists in rides table
DO $$
BEGIN
  -- Check if the column exists
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'rides' AND column_name = 'request_id'
  ) THEN
    -- Add the column if it doesn't exist
    ALTER TABLE rides ADD COLUMN request_id UUID REFERENCES ride_requests(id);
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_rides_request_id ON rides(request_id);

-- Create a function to accept a ride request that bypasses the schema cache
CREATE OR REPLACE FUNCTION accept_ride_request(
  p_request_id UUID,
  p_driver_id UUID,
  p_otp VARCHAR(6)
) RETURNS JSONB AS $$
DECLARE
  v_request RECORD;
  v_ride_id UUID;
  v_result JSONB;
BEGIN
  -- Get the ride request
  SELECT * INTO v_request FROM ride_requests WHERE id = p_request_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Ride request not found');
  END IF;
  
  -- Check if request is still pending
  IF v_request.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Ride request is no longer pending');
  END IF;
  
  -- Update request status
  UPDATE ride_requests SET status = 'accepted' WHERE id = p_request_id;
  
  -- Insert new ride using direct SQL to avoid schema cache issues
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
    updated_at, 
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
    (NOW() + interval '15 minutes'),
    p_otp,
    NOW(),
    NOW(),
    NOW(),
    p_request_id
  ) RETURNING id INTO v_ride_id;
  
  -- Return the new ride data
  v_result := jsonb_build_object(
    'success', true,
    'id', v_ride_id,
    'request_id', p_request_id,
    'parent_id', v_request.parent_id,
    'child_id', v_request.child_id,
    'driver_id', p_driver_id,
    'origin_address', v_request.origin_address,
    'destination_address', v_request.destination_address,
    'scheduled_time', v_request.scheduled_time,
    'status', 'scheduled',
    'fare', v_request.estimated_fare,
    'otp', p_otp,
    'otp_generated_at', NOW()
  );
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    -- If there's an error, revert the request status
    UPDATE ride_requests SET status = 'pending' WHERE id = p_request_id;
    RAISE;
END;
$$ LANGUAGE plpgsql;
