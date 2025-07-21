-- Disable RLS for all relevant tables
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE ride_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE rides DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- Grant all privileges to authenticated users
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON ride_requests TO authenticated;
GRANT ALL ON rides TO authenticated;
GRANT ALL ON messages TO authenticated;

-- Create a trigger to automatically create notifications when a ride request is created
CREATE OR REPLACE FUNCTION create_notifications_for_ride_request()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notification for the parent
  INSERT INTO notifications (
    user_id,
    title,
    content,
    type,
    is_read,
    created_at
  ) VALUES (
    NEW.parent_id,
    'Ride Requested',
    'Your ride request has been submitted.',
    'ride_request',
    FALSE,
    NOW()
  );
  
  -- Notify online drivers
  INSERT INTO notifications (
    user_id,
    title,
    content,
    type,
    is_read,
    created_at
  )
  SELECT 
    id, 
    'New Ride Request', 
    'A new ride request is available. Check your dashboard to accept it.', 
    'new_ride_request', 
    FALSE, 
    NOW()
  FROM 
    users
  WHERE 
    user_type = 'driver' 
    AND is_online = TRUE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for the function
DROP TRIGGER IF EXISTS ride_request_notifications_trigger ON ride_requests;
CREATE TRIGGER ride_request_notifications_trigger
AFTER INSERT ON ride_requests
FOR EACH ROW
EXECUTE FUNCTION create_notifications_for_ride_request();
