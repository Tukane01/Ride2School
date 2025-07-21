-- Function to archive messages when a ride is completed
CREATE OR REPLACE FUNCTION archive_messages_on_ride_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Archive messages by setting archived flag to true
  UPDATE messages
  SET archived = true
  WHERE ride_id = OLD.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run when a ride is moved to completed_rides
CREATE OR REPLACE TRIGGER trigger_archive_messages_on_completion
AFTER INSERT ON completed_rides
FOR EACH ROW
EXECUTE FUNCTION archive_messages_on_ride_completion();

-- Add archived column to messages table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'archived'
  ) THEN
    ALTER TABLE messages ADD COLUMN archived BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Create index on archived column for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_archived ON messages(archived);

-- Create index on ride_id for better performance when archiving
CREATE INDEX IF NOT EXISTS idx_messages_ride_id ON messages(ride_id);
