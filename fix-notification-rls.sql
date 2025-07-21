-- First, let's fix the RLS policy for the notifications table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows users to read their own notifications
CREATE POLICY notifications_select_policy ON notifications
  FOR SELECT USING (user_id = auth.uid());

-- Create a policy that allows users to insert notifications for themselves
CREATE POLICY notifications_insert_self_policy ON notifications
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Create a policy that allows the service role to insert notifications for any user
CREATE POLICY notifications_service_role_policy ON notifications
  FOR ALL USING (auth.role() = 'service_role');

-- Create or replace the function to notify drivers of new ride requests
CREATE OR REPLACE FUNCTION notify_drivers_of_new_ride_request()
RETURNS TRIGGER AS $$
BEGIN
  -- This function runs with service role privileges and can insert notifications for any user
  INSERT INTO notifications (
    user_id, 
    title, 
    content, 
    type, 
    is_read
  )
  SELECT 
    id, 
    'New Ride Request', 
    'A new ride request is available. Check your dashboard to accept it.', 
    'new_ride_request', 
    FALSE
  FROM 
    users
  WHERE 
    user_type = 'driver' 
    AND is_online = TRUE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Make sure the trigger exists
DROP TRIGGER IF EXISTS notify_drivers_trigger ON ride_requests;
CREATE TRIGGER notify_drivers_trigger
AFTER INSERT ON ride_requests
FOR EACH ROW
EXECUTE FUNCTION notify_drivers_of_new_ride_request();
