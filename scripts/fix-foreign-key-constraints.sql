-- Fix foreign key constraints to allow proper ride deletion

-- First, let's check the current foreign key constraints
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND (tc.table_name = 'transactions' OR ccu.table_name = 'rides');

-- Drop the existing foreign key constraint that's causing issues
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_ride_id_fkey;

-- Recreate the foreign key constraint with CASCADE DELETE
-- This will automatically delete transaction records when a ride is deleted
ALTER TABLE transactions 
ADD CONSTRAINT transactions_ride_id_fkey 
FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE;

-- Also check and fix other potential foreign key issues
-- Drop and recreate notifications foreign key with CASCADE
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_ride_id_fkey;
ALTER TABLE notifications 
ADD CONSTRAINT notifications_ride_id_fkey 
FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE SET NULL;

-- Drop and recreate messages foreign key with CASCADE
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_ride_id_fkey;
ALTER TABLE messages 
ADD CONSTRAINT messages_ride_id_fkey 
FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE SET NULL;

-- Drop and recreate ratings foreign key - ratings should reference original ride ID
-- We'll handle this differently since ratings reference completed rides
ALTER TABLE ratings DROP CONSTRAINT IF EXISTS ratings_ride_id_fkey;
-- Don't add back the constraint for ratings as they reference historical ride IDs

-- Verify the new constraints
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name,
    rc.delete_rule
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND (tc.table_name IN ('transactions', 'notifications', 'messages') 
     AND ccu.table_name = 'rides');
