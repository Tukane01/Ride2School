-- Add columns for account deletion
ALTER TABLE users ADD COLUMN IF NOT EXISTS scheduled_for_deletion BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_date TIMESTAMP WITH TIME ZONE;

-- Create a function to permanently delete accounts after 30 days
CREATE OR REPLACE FUNCTION delete_scheduled_accounts() RETURNS void AS $$
BEGIN
  -- Delete all related data for users scheduled for deletion where the deletion date has passed
  DELETE FROM users
  WHERE scheduled_for_deletion = TRUE
  AND deletion_date < NOW();
END;
$$ LANGUAGE plpgsql;
