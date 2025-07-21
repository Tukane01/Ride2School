-- Add notes column to ride_requests table if it doesn't exist
ALTER TABLE ride_requests 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_ride_requests_notes ON ride_requests(notes);
