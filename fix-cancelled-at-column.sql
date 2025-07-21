-- Add cancelled_at column to rides table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'rides' 
        AND column_name = 'cancelled_at'
    ) THEN
        ALTER TABLE rides ADD COLUMN cancelled_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Create an index on the cancelled_at column for better query performance
CREATE INDEX IF NOT EXISTS rides_cancelled_at_idx ON rides(cancelled_at);

-- Update the RLS policy to ensure proper access
DROP POLICY IF EXISTS rides_select_policy ON rides;
CREATE POLICY rides_select_policy ON rides
    FOR SELECT
    USING (
        parent_id = auth.uid() OR 
        driver_id = auth.uid() OR 
        cancelled_by = auth.uid()
    );

-- Update policy for updates
DROP POLICY IF EXISTS rides_update_policy ON rides;
CREATE POLICY rides_update_policy ON rides
    FOR UPDATE
    USING (
        parent_id = auth.uid() OR 
        driver_id = auth.uid()
    );
