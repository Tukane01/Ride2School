-- Create a comprehensive stored procedure to handle ride acceptance
CREATE OR REPLACE FUNCTION public.accept_ride_request_complete(
  request_id UUID,
  driver_id UUID,
  otp TEXT
) RETURNS JSON AS $$
DECLARE
  v_request RECORD;
  v_ride_id UUID;
  v_result JSON;
BEGIN
  -- Check if driver is online
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = driver_id AND is_online = TRUE) THEN
    RETURN json_build_object('success', FALSE, 'message', 'Driver must be online to accept rides');
  END IF;
  
  -- Check if driver already has active rides
  IF EXISTS (
    SELECT 1 FROM rides 
    WHERE driver_id = driver_id 
    AND status IN ('scheduled', 'in_progress')
  ) THEN
    RETURN json_build_object('success', FALSE, 'message', 'Driver already has an active ride');
  END IF;
  
  -- Get the ride request
  SELECT * INTO v_request FROM ride_requests WHERE id = request_id;
  
  IF v_request IS NULL THEN
    RETURN json_build_object('success', FALSE, 'message', 'Ride request not found');
  END IF;
  
  -- Check if request is still pending
  IF v_request.status != 'pending' THEN
    RETURN json_build_object('success', FALSE, 'message', 'Ride request is no longer pending');
  END IF;
  
  -- Start transaction
  BEGIN
    -- Update request status
    UPDATE ride_requests SET status = 'accepted' WHERE id = request_id;
    
    -- Create new ride
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
      otp,
      otp_generated_at,
      current_location_lat,
      current_location_lng,
      current_location_address,
      estimated_arrival,
      created_at,
      updated_at,
      request_id
    ) VALUES (
      v_request.parent_id,
      v_request.child_id,
      driver_id,
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
      otp,
      NOW(),
      v_request.origin_lat,
      v_request.origin_lng,
      v_request.origin_address,
      (NOW() + interval '15 minutes'),
      NOW(),
      NOW(),
      request_id
    ) RETURNING id INTO v_ride_id;
    
    -- Create notification for parent
    INSERT INTO notifications (
      user_id,
      title,
      content,
      type,
      ride_id,
      is_read,
      created_at
    ) VALUES (
      v_request.parent_id,
      'Ride Request Accepted',
      'Your ride request has been accepted by a driver. Your OTP is: ' || otp,
      'ride_accepted',
      v_ride_id,
      FALSE,
      NOW()
    );
    
    -- Return success with ride data
    SELECT json_build_object(
      'success', TRUE,
      'ride_id', v_ride_id,
      'parent_id', v_request.parent_id,
      'child_id', v_request.child_id,
      'origin_address', v_request.origin_address,
      'destination_address', v_request.destination_address,
      'scheduled_time', v_request.scheduled_time,
      'fare', v_request.estimated_fare,
      'otp', otp
    ) INTO v_result;
    
    RETURN v_result;
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback in case of error
      RAISE;
  END;
END;
$$ LANGUAGE plpgsql;
