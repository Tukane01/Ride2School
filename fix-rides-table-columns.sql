-- Add missing columns to rides table if they don't exist
DO $$
BEGIN
    -- Add cancelled_by column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'rides' 
        AND column_name = 'cancelled_by'
    ) THEN
        ALTER TABLE rides ADD COLUMN cancelled_by UUID REFERENCES users(id);
        CREATE INDEX IF NOT EXISTS rides_cancelled_by_idx ON rides(cancelled_by);
    END IF;

    -- Add cancelled_at column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'rides' 
        AND column_name = 'cancelled_at'
    ) THEN
        ALTER TABLE rides ADD COLUMN cancelled_at TIMESTAMP WITH TIME ZONE;
        CREATE INDEX IF NOT EXISTS rides_cancelled_at_idx ON rides(cancelled_at);
    END IF;
END $$;

-- Update RLS policies to include the new columns
DROP POLICY IF EXISTS rides_select_policy ON rides;
CREATE POLICY rides_select_policy ON rides
    FOR SELECT
    USING (
        parent_id = auth.uid() OR 
        driver_id = auth.uid() OR 
        cancelled_by = auth.uid()
    );

-- Update existing cancelled rides to have a cancelled_at timestamp
UPDATE rides 
SET cancelled_at = updated_at 
WHERE status = 'cancelled' AND cancelled_at IS NULL;
