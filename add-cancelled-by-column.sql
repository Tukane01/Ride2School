-- Add cancelled_by column to rides table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'rides' 
        AND column_name = 'cancelled_by'
    ) THEN
        ALTER TABLE rides ADD COLUMN cancelled_by UUID REFERENCES users(id);
    END IF;
END $$;

-- Create an index on the cancelled_by column for better query performance
CREATE INDEX IF NOT EXISTS rides_cancelled_by_idx ON rides(cancelled_by);

-- Update the RLS policy to allow access to the cancelled_by field
DROP POLICY IF EXISTS rides_select_policy ON rides;
CREATE POLICY rides_select_policy ON rides
    FOR SELECT
    USING (
        parent_id = auth.uid() OR 
        driver_id = auth.uid() OR 
        cancelled_by = auth.uid()
    );
