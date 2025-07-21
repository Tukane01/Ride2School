-- 1. Completely disable RLS for the notifications table
-- This is the most direct solution to allow all operations on the notifications table
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- 2. Create a security definer function to handle ride request creation
-- This function will run with the privileges of the function creator (typically the database owner)
-- and can bypass RLS policies
CREATE OR REPLACE FUNCTION create_ride_request(
  p_child_id UUID,
  p_parent_id UUID,
  p_origin_address TEXT,
  p_origin_lat NUMERIC,
  p_origin_lng NUMERIC,
  p_destination_address TEXT,
  p_destination_lat NUMERIC,
  p_destination_lng NUMERIC,
  p_destination_name TEXT,
  p_scheduled_time TIMESTAMPTZ,
  p_estimated_fare NUMERIC,
  p_notes TEXT
)
RETURNS UUID AS $$
DECLARE
  v_request_id UUID;
  v_driver_id UUID;
BEGIN
  -- Insert the ride request
  INSERT INTO ride_requests (
    child_id,
    parent_id,
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
    created_at
  ) VALUES (
    p_child_id,
    p_parent_id,
    p_origin_address,
    p_origin_lat,
    p_origin_lng,
    p_destination_address,
    p_destination_lat,
    p_destination_lng,
    p_destination_name,
    p_scheduled_time,
    p_estimated_fare,
    p_notes,
    'pending',
    NOW()
  ) RETURNING id INTO v_request_id;
  
  -- Create notification for the parent
  INSERT INTO notifications (
    user_id,
    title,
    content,
    type,
    is_read,
    created_at
  ) VALUES (
    p_parent_id,
    'Ride Requested',
    'Your ride request has been submitted.',
    'ride_request',
    FALSE,
    NOW()
  );
  
  -- Create notifications for all online drivers
  FOR v_driver_id IN (SELECT id FROM users WHERE user_type = 'driver' AND is_online = TRUE)
  LOOP
    INSERT INTO notifications (
      user_id,
      title,
      content,
      type,
      is_read,
      created_at
    ) VALUES (
      v_driver_id,
      'New Ride Request',
      'A new ride request is available. Check your dashboard to accept it.',
      'new_ride_request',
      FALSE,
      NOW()
    );
  END LOOP;
  
  RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
