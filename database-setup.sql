-- Add the uuid extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table with all required columns
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  surname VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  id_number VARCHAR(13) NOT NULL UNIQUE,
  address TEXT NOT NULL,
  gender VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  user_type VARCHAR(10) NOT NULL CHECK (user_type IN ('parent', 'driver')),
  profile_pic TEXT,
  wallet_balance DECIMAL(10, 2) DEFAULT 0.00,
  is_online BOOLEAN DEFAULT FALSE,
  last_online TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create children table with proper foreign key constraints
CREATE TABLE IF NOT EXISTS children (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  surname VARCHAR(255) NOT NULL,
  id_number VARCHAR(13) NOT NULL UNIQUE,
  school_name VARCHAR(255) NOT NULL,
  school_address TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure parent is actually a parent
  CONSTRAINT check_parent_type CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = parent_id AND user_type = 'parent')
  )
);

-- Create cars table with proper foreign key constraints
CREATE TABLE IF NOT EXISTS cars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  make VARCHAR(255) NOT NULL,
  model VARCHAR(255) NOT NULL,
  color VARCHAR(255) NOT NULL,
  registration VARCHAR(255) NOT NULL UNIQUE,
  vin_number VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure driver is actually a driver
  CONSTRAINT check_driver_type CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = driver_id AND user_type = 'driver')
  )
);

-- Create ride_requests table with proper relationships
CREATE TABLE IF NOT EXISTS ride_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  origin_address TEXT NOT NULL,
  origin_lat DECIMAL(10, 8) NOT NULL,
  origin_lng DECIMAL(11, 8) NOT NULL,
  destination_address TEXT NOT NULL,
  destination_lat DECIMAL(10, 8) NOT NULL,
  destination_lng DECIMAL(11, 8) NOT NULL,
  destination_name VARCHAR(255) NOT NULL,
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  estimated_fare DECIMAL(10, 2) NOT NULL CHECK (estimated_fare > 0),
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure parent owns the child
  CONSTRAINT check_parent_child_relationship CHECK (
    EXISTS (SELECT 1 FROM children WHERE id = child_id AND parent_id = ride_requests.parent_id)
  ),
  
  -- Ensure scheduled time is in the future
  CONSTRAINT check_future_scheduled_time CHECK (scheduled_time > NOW())
);

-- Create rides table with comprehensive relationships
CREATE TABLE IF NOT EXISTS rides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES ride_requests(id) ON DELETE SET NULL,
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
  status VARCHAR(20) NOT NULL CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  fare DECIMAL(10, 2) NOT NULL CHECK (fare > 0),
  otp VARCHAR(6),
  otp_generated_at TIMESTAMP WITH TIME ZONE,
  current_location_lat DECIMAL(10, 8),
  current_location_lng DECIMAL(11, 8),
  current_location_address TEXT,
  estimated_arrival TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancelled_by UUID REFERENCES users(id) ON DELETE SET NULL,
  rated_by_parent BOOLEAN DEFAULT FALSE,
  rated_by_driver BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure parent owns the child
  CONSTRAINT check_parent_child_relationship CHECK (
    EXISTS (SELECT 1 FROM children WHERE id = child_id AND parent_id = rides.parent_id)
  ),
  
  -- Ensure driver is actually a driver
  CONSTRAINT check_driver_type CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = driver_id AND user_type = 'driver')
  ),
  
  -- Ensure parent is actually a parent
  CONSTRAINT check_parent_type CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = parent_id AND user_type = 'parent')
  ),
  
  -- Status-based constraints
  CONSTRAINT check_completed_at CHECK (
    (status = 'completed' AND completed_at IS NOT NULL) OR 
    (status != 'completed' AND completed_at IS NULL)
  ),
  
  CONSTRAINT check_cancelled_at CHECK (
    (status = 'cancelled' AND cancelled_at IS NOT NULL AND cancelled_by IS NOT NULL) OR 
    (status != 'cancelled' AND cancelled_at IS NULL)
  ),
  
  -- OTP constraints
  CONSTRAINT check_otp_length CHECK (otp IS NULL OR LENGTH(otp) = 6)
);

-- Create messages table with proper relationships
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ride_id UUID REFERENCES rides(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (LENGTH(content) > 0),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent self-messaging
  CONSTRAINT check_different_users CHECK (sender_id != recipient_id)
);

-- Create transactions table with proper relationships
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  type VARCHAR(10) NOT NULL CHECK (type IN ('credit', 'debit')),
  description TEXT NOT NULL CHECK (LENGTH(description) > 0),
  ride_id UUID REFERENCES rides(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ratings table with proper relationships and constraints
CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  rater_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rated_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rated_type VARCHAR(10) NOT NULL CHECK (rated_type IN ('parent', 'driver')),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent self-rating
  CONSTRAINT check_different_users CHECK (rater_id != rated_id),
  
  -- Ensure only one rating per ride per rater
  CONSTRAINT unique_rating_per_ride_rater UNIQUE (ride_id, rater_id),
  
  -- Ensure rated user type matches rated_type
  CONSTRAINT check_rated_type_matches CHECK (
    (rated_type = 'parent' AND EXISTS (SELECT 1 FROM users WHERE id = rated_id AND user_type = 'parent')) OR
    (rated_type = 'driver' AND EXISTS (SELECT 1 FROM users WHERE id = rated_id AND user_type = 'driver'))
  )
);

-- Create notifications table with proper relationships
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL CHECK (LENGTH(title) > 0),
  content TEXT NOT NULL CHECK (LENGTH(content) > 0),
  type VARCHAR(50) NOT NULL,
  ride_id UUID REFERENCES rides(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create help_articles table
CREATE TABLE IF NOT EXISTS help_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL CHECK (LENGTH(title) > 0),
  content TEXT NOT NULL CHECK (LENGTH(content) > 0),
  category VARCHAR(50) NOT NULL CHECK (LENGTH(category) > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
