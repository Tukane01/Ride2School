-- Add cancelled_at column to rides table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'rides' AND column_name = 'cancelled_at'
    ) THEN
        ALTER TABLE rides ADD COLUMN cancelled_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;
