-- Check if cars table exists, if not create it
CREATE TABLE IF NOT EXISTS cars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  make VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  color VARCHAR(50) NOT NULL,
  registration VARCHAR(20) NOT NULL,
  vin_number VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Check if users table has is_online column, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'is_online'
  ) THEN
    ALTER TABLE users ADD COLUMN is_online BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Check if users table has last_online column, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'last_online'
  ) THEN
    ALTER TABLE users ADD COLUMN last_online TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Check if ride_requests table exists, if not create it
CREATE TABLE IF NOT EXISTS ride_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  origin_lat DECIMAL(10, 8) NOT NULL,
  origin_lng DECIMAL(11, 8) NOT NULL,
  origin_address TEXT NOT NULL,
  destination_lat DECIMAL(10, 8) NOT NULL,
  destination_lng DECIMAL(11, 8) NOT NULL,
  destination_address TEXT NOT NULL,
  destination_name VARCHAR(255),
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  estimated_fare DECIMAL(10, 2) NOT NULL,
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Check if ratings table exists, if not create it
CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  rater_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rated_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rated_type VARCHAR(20) NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Check if rides table has necessary columns for driver functionality
DO $$
BEGIN
  -- Check for otp column
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'rides' AND column_name = 'otp'
  ) THEN
    ALTER TABLE rides ADD COLUMN otp VARCHAR(6);
  END IF;

  -- Check for otp_generated_at column
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'rides' AND column_name = 'otp_generated_at'
  ) THEN
    ALTER TABLE rides ADD COLUMN otp_generated_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Check for current_location columns
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'rides' AND column_name = 'current_location_lat'
  ) THEN
    ALTER TABLE rides ADD COLUMN current_location_lat DECIMAL(10, 8);
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'rides' AND column_name = 'current_location_lng'
  ) THEN
    ALTER TABLE rides ADD COLUMN current_location_lng DECIMAL(11, 8);
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'rides' AND column_name = 'current_location_address'
  ) THEN
    ALTER TABLE rides ADD COLUMN current_location_address TEXT;
  END IF;

  -- Check for estimated_arrival column
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'rides' AND column_name = 'estimated_arrival'
  ) THEN
    ALTER TABLE rides ADD COLUMN estimated_arrival TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Create index for faster ride request queries
CREATE INDEX IF NOT EXISTS idx_ride_requests_status ON ride_requests(status);
CREATE INDEX IF NOT EXISTS idx_users_is_online ON users(is_online) WHERE is_online = TRUE;
