-- Fix missing columns in the database schema

-- Add completed_at column to rides table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'rides' AND column_name = 'completed_at'
    ) THEN
        ALTER TABLE rides ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Add is_online column to users table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'is_online'
    ) THEN
        ALTER TABLE users ADD COLUMN is_online BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add last_online column to users table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'last_online'
    ) THEN
        ALTER TABLE users ADD COLUMN last_online TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Update existing records to set default values
UPDATE rides SET completed_at = updated_at WHERE status = 'completed' AND completed_at IS NULL;
UPDATE users SET is_online = FALSE WHERE is_online IS NULL;
