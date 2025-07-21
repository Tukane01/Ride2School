-- 1. Check and fix the ride_requests table structure
DO $$
BEGIN
  -- Add any missing columns if needed
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'ride_requests' AND column_name = 'parent_id') THEN
    ALTER TABLE ride_requests ADD COLUMN parent_id UUID REFERENCES users(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'ride_requests' AND column_name = 'child_id') THEN
    ALTER TABLE ride_requests ADD COLUMN child_id UUID REFERENCES children(id);
  END IF;
END $$;

-- 2. Fix the RLS policies for ride_requests table
-- Drop existing policies if any
DROP POLICY IF EXISTS ride_requests_insert_policy ON ride_requests;
DROP POLICY IF EXISTS ride_requests_select_policy ON ride_requests;

-- Enable RLS on ride_requests table
ALTER TABLE ride_requests ENABLE ROW LEVEL SECURITY;

-- Create policy for inserting ride requests (parents can create)
CREATE POLICY ride_requests_insert_policy ON ride_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = parent_id);

-- Create policy for selecting ride requests (parents can see their own, drivers can see all pending)
CREATE POLICY ride_requests_select_policy ON ride_requests
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = parent_id OR 
    (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND user_type = 'driver' AND is_online = true) AND status = 'pending')
  );

-- 3. Fix the RLS policies for notifications table
-- Drop existing policies if any
DROP POLICY IF EXISTS notifications_insert_policy ON notifications;
DROP POLICY IF EXISTS notifications_select_policy ON notifications;

-- Enable RLS on notifications table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policy for inserting notifications (anyone can insert)
CREATE POLICY notifications_insert_policy ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policy for selecting notifications (users can only see their own)
CREATE POLICY notifications_select_policy ON notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. Create a function to validate ride requests before insertion
CREATE OR REPLACE FUNCTION validate_ride_request()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if parent exists
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = NEW.parent_id AND user_type = 'parent') THEN
    RAISE EXCEPTION 'Parent not found or not a parent user';
  END IF;
  
  -- Check if child exists and belongs to parent
  IF NOT EXISTS (SELECT 1 FROM children WHERE id = NEW.child_id AND parent_id = NEW.parent_id) THEN
    RAISE EXCEPTION 'Child not found or does not belong to this parent';
  END IF;
  
  -- Set default status if not provided
  IF NEW.status IS NULL THEN
    NEW.status := 'pending';
  END IF;
  
  -- Set created_at if not provided
  IF NEW.created_at IS NULL THEN
    NEW.created_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for validation
DROP TRIGGER IF EXISTS validate_ride_request_trigger ON ride_requests;
CREATE TRIGGER validate_ride_request_trigger
BEFORE INSERT ON ride_requests
FOR EACH ROW
EXECUTE FUNCTION validate_ride_request();
