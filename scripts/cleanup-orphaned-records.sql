-- Clean up any orphaned records that might exist

-- 1. Find and clean up orphaned transactions
DELETE FROM transactions 
WHERE ride_id IS NOT NULL 
AND ride_id NOT IN (SELECT id FROM rides);

-- 2. Find and clean up orphaned notifications with ride references
UPDATE notifications 
SET ride_id = NULL 
WHERE ride_id IS NOT NULL 
AND ride_id NOT IN (SELECT id FROM rides);

-- 3. Find and clean up orphaned messages with ride references
UPDATE messages 
SET archived = true, archived_at = NOW()
WHERE ride_id IS NOT NULL 
AND ride_id NOT IN (SELECT id FROM rides)
AND archived = false;

-- 4. Report on cleanup
SELECT 
    'transactions' as table_name,
    COUNT(*) as orphaned_records_cleaned
FROM transactions 
WHERE ride_id IS NOT NULL 
AND ride_id NOT IN (SELECT id FROM rides)

UNION ALL

SELECT 
    'notifications' as table_name,
    COUNT(*) as records_with_null_ride_id
FROM notifications 
WHERE ride_id IS NULL

UNION ALL

SELECT 
    'messages' as table_name,
    COUNT(*) as archived_messages
FROM messages 
WHERE archived = true;
