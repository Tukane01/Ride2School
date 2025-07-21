-- Add coordinate columns to ride_requests table
ALTER TABLE ride_requests 
ADD COLUMN IF NOT EXISTS pickup_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS pickup_lng DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS dropoff_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS dropoff_lng DECIMAL(11, 8);

-- Add coordinate columns to rides table as well
ALTER TABLE rides 
ADD COLUMN IF NOT EXISTS pickup_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS pickup_lng DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS dropoff_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS dropoff_lng DECIMAL(11, 8);

-- Create indexes for better performance on coordinate queries
CREATE INDEX IF NOT EXISTS idx_ride_requests_pickup_coords ON ride_requests(pickup_lat, pickup_lng);
CREATE INDEX IF NOT EXISTS idx_ride_requests_dropoff_coords ON ride_requests(dropoff_lat, dropoff_lng);
CREATE INDEX IF NOT EXISTS idx_rides_pickup_coords ON rides(pickup_lat, pickup_lng);
CREATE INDEX IF NOT EXISTS idx_rides_dropoff_coords ON rides(dropoff_lat, dropoff_lng);

-- Create a table for geocoded addresses cache
CREATE TABLE IF NOT EXISTS geocoded_addresses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    address TEXT NOT NULL UNIQUE,
    lat DECIMAL(10, 8) NOT NULL,
    lng DECIMAL(11, 8) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for geocoded addresses
CREATE INDEX IF NOT EXISTS idx_geocoded_addresses_address ON geocoded_addresses(address);
CREATE INDEX IF NOT EXISTS idx_geocoded_addresses_coords ON geocoded_addresses(lat, lng);

-- Enable RLS on geocoded_addresses table
ALTER TABLE geocoded_addresses ENABLE ROW LEVEL SECURITY;

-- Create policy for geocoded_addresses (allow all operations for now)
CREATE POLICY "Allow all operations on geocoded_addresses" ON geocoded_addresses
    FOR ALL USING (true) WITH CHECK (true);
