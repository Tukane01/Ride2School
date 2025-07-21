-- Fix completed_rides table to properly accept data from active rides table

-- First, let's check and fix the completed_rides table structure
DO $$
BEGIN
  -- Drop the table if it exists and recreate with proper structure
  DROP TABLE IF EXISTS completed_rides CASCADE;
  
  -- Create completed_rides table with all necessary columns from rides table
  CREATE TABLE completed_rides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_ride_id UUID NOT NULL, -- Reference to the original ride ID
    request_id UUID, -- Reference to the original request
    parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    
    -- Location data
    origin_address TEXT NOT NULL,
    origin_lat DECIMAL(10, 8) NOT NULL,
    origin_lng DECIMAL(11, 8) NOT NULL,
    destination_address TEXT NOT NULL,
    destination_lat DECIMAL(10, 8) NOT NULL,
    destination_lng DECIMAL(11, 8) NOT NULL,
    destination_name TEXT,
    
    -- Current location (where ride ended)
    current_location_lat DECIMAL(10, 8),
    current_location_lng DECIMAL(11, 8),
    current_location_address TEXT,
    
    -- Time data
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    actual_pickup_time TIMESTAMP WITH TIME ZONE,
    actual_dropoff_time TIMESTAMP WITH TIME ZONE,
    
    -- Ride details
    fare DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    distance_traveled DECIMAL(8, 2), -- in kilometers
    duration_minutes INTEGER, -- actual duration
    
    -- OTP data
    otp VARCHAR(6),
    otp_generated_at TIMESTAMP WITH TIME ZONE,
    
    -- Estimated arrival (for reference)
    estimated_arrival TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
  );
  
  -- Create indexes for performance
  CREATE INDEX idx_completed_rides_original_ride_id ON completed_rides(original_ride_id);
  CREATE INDEX idx_completed_rides_parent_id ON completed_rides(parent_id);
  CREATE INDEX idx_completed_rides_driver_id ON completed_rides(driver_id);
  CREATE INDEX idx_completed_rides_child_id ON completed_rides(child_id);
  CREATE INDEX idx_completed_rides_completed_at ON completed_rides(completed_at);
  CREATE INDEX idx_completed_rides_scheduled_time ON completed_rides(scheduled_time);
  
  -- Add unique constraint on original_ride_id to prevent duplicates
  ALTER TABLE completed_rides ADD CONSTRAINT unique_original_ride_id UNIQUE (original_ride_id);
  
END $$;

-- Enable RLS on completed_rides table
ALTER TABLE completed_rides ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for completed_rides
CREATE POLICY "Parents can view their completed rides" ON completed_rides
  FOR SELECT USING (parent_id = auth.uid());

CREATE POLICY "Drivers can view their completed rides" ON completed_rides
  FOR SELECT USING (driver_id = auth.uid());

-- Service role can do everything
CREATE POLICY "Service role can manage completed rides" ON completed_rides
  FOR ALL USING (auth.role() = 'service_role');
