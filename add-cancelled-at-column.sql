-- Check if cancelled_at column exists in rides table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'rides' 
        AND column_name = 'cancelled_at'
    ) THEN
        -- Add cancelled_at column if it doesn't exist
        ALTER TABLE rides ADD COLUMN cancelled_at TIMESTAMP WITH TIME ZONE;
        
        -- Update existing cancelled rides with a timestamp
        UPDATE rides 
        SET cancelled_at = updated_at 
        WHERE status = 'cancelled' AND cancelled_at IS NULL;
    END IF;
END $$;

-- Refresh the schema cache for the rides table
COMMENT ON TABLE rides IS 'Table containing ride information with cancelled_at column';
