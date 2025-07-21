-- Create cancelled_rides table with proper relationships
CREATE TABLE IF NOT EXISTS cancelled_rides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_ride_id UUID NOT NULL,
  parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  origin_address TEXT NOT NULL,
  origin_lat DECIMAL(10, 8) NOT NULL,
  origin_lng DECIMAL(11, 8) NOT NULL,
  destination_address TEXT NOT NULL,
  destination_lat DECIMAL(10, 8) NOT NULL,
  destination_lng DECIMAL(11, 8) NOT NULL,
  destination_name VARCHAR(255) NOT NULL,
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  fare DECIMAL(10, 2) NOT NULL CHECK (fare > 0),
  otp VARCHAR(6),
  otp_generated_at TIMESTAMP WITH TIME ZONE,
  current_location_lat DECIMAL(10, 8),
  current_location_lng DECIMAL(11, 8),
  current_location_address TEXT,
  estimated_arrival TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  cancelled_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cancellation_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Ensure parent owns the child
  CONSTRAINT check_cancelled_parent_child_relationship CHECK (
    EXISTS (SELECT 1 FROM children WHERE id = child_id AND parent_id = cancelled_rides.parent_id)
  ),
  
  -- Ensure driver is actually a driver
  CONSTRAINT check_cancelled_driver_type CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = driver_id AND user_type = 'driver')
  ),
  
  -- Ensure parent is actually a parent
  CONSTRAINT check_cancelled_parent_type CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = parent_id AND user_type = 'parent')
  ),
  
  -- Ensure cancellation reason is provided
  CONSTRAINT check_cancellation_reason CHECK (
    cancellation_reason IS NOT NULL AND LENGTH(cancellation_reason) > 0
  )
);

-- Create completed_rides table with proper relationships
CREATE TABLE IF NOT EXISTS completed_rides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_ride_id UUID NOT NULL,
  request_id UUID,
  parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  origin_address TEXT NOT NULL,
  origin_lat DECIMAL(10, 8) NOT NULL,
  origin_lng DECIMAL(11, 8) NOT NULL,
  destination_address TEXT NOT NULL,
  destination_lat DECIMAL(10, 8) NOT NULL,
  destination_lng DECIMAL(11, 8) NOT NULL,
  destination_name VARCHAR(255) NOT NULL,
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  fare DECIMAL(10, 2) NOT NULL CHECK (fare > 0),
  otp VARCHAR(6),
  otp_generated_at TIMESTAMP WITH TIME ZONE,
  current_location_lat DECIMAL(10, 8),
  current_location_lng DECIMAL(11, 8),
  current_location_address TEXT,
  estimated_arrival TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  actual_pickup_time TIMESTAMP WITH TIME ZONE,
  actual_dropoff_time TIMESTAMP WITH TIME ZONE,
  distance_traveled DECIMAL(10, 2) CHECK (distance_traveled >= 0),
  duration_minutes INTEGER CHECK (duration_minutes >= 0),
  rated_by_parent BOOLEAN DEFAULT FALSE,
  rated_by_driver BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Ensure parent owns the child
  CONSTRAINT check_completed_parent_child_relationship CHECK (
    EXISTS (SELECT 1 FROM children WHERE id = child_id AND parent_id = completed_rides.parent_id)
  ),
  
  -- Ensure driver is actually a driver
  CONSTRAINT check_completed_driver_type CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = driver_id AND user_type = 'driver')
  ),
  
  -- Ensure parent is actually a parent
  CONSTRAINT check_completed_parent_type CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = parent_id AND user_type = 'parent')
  ),
  
  -- Ensure logical time constraints
  CONSTRAINT check_pickup_before_dropoff CHECK (
    actual_pickup_time IS NULL OR actual_dropoff_time IS NULL OR 
    actual_pickup_time <= actual_dropoff_time
  )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cancelled_rides_parent_id ON cancelled_rides(parent_id);
CREATE INDEX IF NOT EXISTS idx_cancelled_rides_driver_id ON cancelled_rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_cancelled_rides_child_id ON cancelled_rides(child_id);
CREATE INDEX IF NOT EXISTS idx_cancelled_rides_cancelled_at ON cancelled_rides(cancelled_at);
CREATE INDEX IF NOT EXISTS idx_cancelled_rides_cancelled_by ON cancelled_rides(cancelled_by);
CREATE INDEX IF NOT EXISTS idx_cancelled_rides_original_ride_id ON cancelled_rides(original_ride_id);

CREATE INDEX IF NOT EXISTS idx_completed_rides_parent_id ON completed_rides(parent_id);
CREATE INDEX IF NOT EXISTS idx_completed_rides_driver_id ON completed_rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_completed_rides_child_id ON completed_rides(child_id);
CREATE INDEX IF NOT EXISTS idx_completed_rides_completed_at ON completed_rides(completed_at);
CREATE INDEX IF NOT EXISTS idx_completed_rides_original_ride_id ON completed_rides(original_ride_id);
CREATE INDEX IF NOT EXISTS idx_completed_rides_request_id ON completed_rides(request_id);

-- Disable RLS for the history tables since they're only accessed through controlled functions
ALTER TABLE cancelled_rides DISABLE ROW LEVEL SECURITY;
ALTER TABLE completed_rides DISABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT ON cancelled_rides TO authenticated;
GRANT SELECT, INSERT ON completed_rides TO authenticated;

-- Update the functions to ensure they work properly with all constraints
CREATE OR REPLACE FUNCTION move_ride_to_cancelled(
  ride_id UUID,
  cancelled_by_user_id UUID,
  cancellation_reason TEXT DEFAULT 'No reason provided'
) RETURNS BOOLEAN AS $$
DECLARE
  ride_record RECORD;
BEGIN
  -- Get the ride data
  SELECT * INTO ride_record FROM rides WHERE id = ride_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ride not found';
  END IF;
  
  -- Ensure cancellation reason is provided
  IF cancellation_reason IS NULL OR LENGTH(TRIM(cancellation_reason)) = 0 THEN
    cancellation_reason := 'No reason provided';
  END IF;
  
  -- Insert into cancelled_rides table
  INSERT INTO cancelled_rides (
    original_ride_id,
    parent_id,
    child_id,
    driver_id,
    origin_address,
    origin_lat,
    origin_lng,
    destination_address,
    destination_lat,
    destination_lng,
    destination_name,
    scheduled_time,
    fare,
    otp,
    otp_generated_at,
    current_location_lat,
    current_location_lng,
    current_location_address,
    estimated_arrival,
    cancelled_by,
    cancellation_reason,
    created_at,
    updated_at
  ) VALUES (
    ride_record.id,
    ride_record.parent_id,
    ride_record.child_id,
    ride_record.driver_id,
    ride_record.origin_address,
    ride_record.origin_lat,
    ride_record.origin_lng,
    ride_record.destination_address,
    ride_record.destination_lat,
    ride_record.destination_lng,
    ride_record.destination_name,
    ride_record.scheduled_time,
    ride_record.fare,
    ride_record.otp,
    ride_record.otp_generated_at,
    ride_record.current_location_lat,
    ride_record.current_location_lng,
    ride_record.current_location_address,
    ride_record.estimated_arrival,
    cancelled_by_user_id,
    cancellation_reason,
    ride_record.created_at,
    ride_record.updated_at
  );
  
  -- Delete from rides table
  DELETE FROM rides WHERE id = ride_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION move_ride_to_completed(
  ride_id UUID,
  actual_pickup_time TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  actual_dropoff_time TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  distance_traveled DECIMAL DEFAULT NULL,
  duration_minutes INTEGER DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  ride_record RECORD;
BEGIN
  -- Get the ride data
  SELECT * INTO ride_record FROM rides WHERE id = ride_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ride not found';
  END IF;
  
  -- Set default values if not provided
  IF actual_dropoff_time IS NULL THEN
    actual_dropoff_time := NOW();
  END IF;
  
  -- Insert into completed_rides table
  INSERT INTO completed_rides (
    original_ride_id,
    request_id,
    parent_id,
    child_id,
    driver_id,
    origin_address,
    origin_lat,
    origin_lng,
    destination_address,
    destination_lat,
    destination_lng,
    destination_name,
    scheduled_time,
    fare,
    otp,
    otp_generated_at,
    current_location_lat,
    current_location_lng,
    current_location_address,
    estimated_arrival,
    actual_pickup_time,
    actual_dropoff_time,
    distance_traveled,
    duration_minutes,
    rated_by_parent,
    rated_by_driver,
    created_at,
    updated_at
  ) VALUES (
    ride_record.id,
    ride_record.request_id,
    ride_record.parent_id,
    ride_record.child_id,
    ride_record.driver_id,
    ride_record.origin_address,
    ride_record.origin_lat,
    ride_record.origin_lng,
    ride_record.destination_address,
    ride_record.destination_lat,
    ride_record.destination_lng,
    ride_record.destination_name,
    ride_record.scheduled_time,
    ride_record.fare,
    ride_record.otp,
    ride_record.otp_generated_at,
    ride_record.current_location_lat,
    ride_record.current_location_lng,
    ride_record.current_location_address,
    ride_record.estimated_arrival,
    actual_pickup_time,
    actual_dropoff_time,
    distance_traveled,
    duration_minutes,
    ride_record.rated_by_parent,
    ride_record.rated_by_driver,
    ride_record.created_at,
    ride_record.updated_at
  );
  
  -- Delete from rides table
  DELETE FROM rides WHERE id = ride_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
