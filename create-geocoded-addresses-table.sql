-- Create table for storing geocoded addresses
CREATE TABLE IF NOT EXISTS geocoded_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  address TEXT NOT NULL UNIQUE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on address for faster lookups
CREATE INDEX IF NOT EXISTS idx_geocoded_addresses_address ON geocoded_addresses (address);

-- Add RLS policies
ALTER TABLE geocoded_addresses ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to select from the table
CREATE POLICY geocoded_addresses_select_policy ON geocoded_addresses
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow all authenticated users to insert into the table
CREATE POLICY geocoded_addresses_insert_policy ON geocoded_addresses
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow all authenticated users to update their own records
CREATE POLICY geocoded_addresses_update_policy ON geocoded_addresses
  FOR UPDATE USING (auth.role() = 'authenticated');
