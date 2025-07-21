-- Verify that the fixes are applied correctly

-- 1. Check messages table schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'messages' 
AND column_name IN ('archived', 'archived_at')
ORDER BY column_name;

-- 2. Check function definitions (should only show one of each)
SELECT routine_name, specific_name, routine_definition
FROM information_schema.routines 
WHERE routine_name IN ('move_ride_to_completed', 'move_ride_back_to_requests', 'move_ride_to_cancelled')
ORDER BY routine_name;

-- 3. Test function parameter compatibility
SELECT 
    routine_name,
    parameter_name,
    data_type,
    parameter_mode
FROM information_schema.parameters 
WHERE specific_name IN (
    SELECT specific_name 
    FROM information_schema.routines 
    WHERE routine_name = 'move_ride_to_completed'
)
ORDER BY routine_name, ordinal_position;
