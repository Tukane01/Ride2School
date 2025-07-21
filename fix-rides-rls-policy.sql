-- Enable Row Level Security on rides table
ALTER TABLE rides ENABLE ROW LEVEL SECURITY;

-- Create policy for selecting rides
CREATE POLICY select_rides ON rides
  FOR SELECT
  USING (
    auth.uid() = parent_id OR 
    auth.uid() = driver_id OR 
    auth.uid() IN (SELECT id FROM users WHERE user_type = 'admin')
  );

-- Create policy for inserting rides (via API only)
CREATE POLICY insert_rides ON rides
  FOR INSERT
  WITH CHECK (true);  -- We'll control this via our API

-- Create policy for updating rides
CREATE POLICY update_rides ON rides
  FOR UPDATE
  USING (
    auth.uid() = driver_id OR 
    auth.uid() = parent_id OR
    auth.uid() IN (SELECT id FROM users WHERE user_type = 'admin')
  );

-- Create policy for deleting rides (admin only)
CREATE POLICY delete_rides ON rides
  FOR DELETE
  USING (
    auth.uid() IN (SELECT id FROM users WHERE user_type = 'admin')
  );
