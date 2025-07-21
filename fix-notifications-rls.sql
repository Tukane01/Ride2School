-- Drop existing policies on the notifications table
DROP POLICY IF EXISTS notifications_select_policy ON notifications;
DROP POLICY IF EXISTS notifications_insert_self_policy ON notifications;
DROP POLICY IF EXISTS notifications_service_role_policy ON notifications;
DROP POLICY IF EXISTS notifications_insert_policy ON notifications;

-- Make sure RLS is enabled
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to select only their own notifications
CREATE POLICY notifications_select_policy ON notifications
  FOR SELECT USING (user_id = auth.uid());

-- Create a policy that allows ANY user to insert notifications for ANY user
-- This is necessary for the ride request workflow
CREATE POLICY notifications_insert_policy ON notifications
  FOR INSERT TO authenticated WITH CHECK (true);

-- Create a policy that allows users to update their own notifications (e.g., marking as read)
CREATE POLICY notifications_update_policy ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Create policy for service role to have full access
CREATE POLICY notifications_service_role_policy ON notifications
  FOR ALL USING (auth.role() = 'service_role');
