-- Test script to verify foreign key constraint fixes

-- 1. Check current foreign key constraints
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
     AND ccu.table_name = 'rides')
ORDER BY tc.table_name, kcu.column_name;

-- 2. Test transaction creation and deletion
DO $$
DECLARE
    test_ride_id UUID;
    test_user_id UUID;
    transaction_count INTEGER;
BEGIN
    -- Get a test user ID
    SELECT id INTO test_user_id FROM users WHERE user_type = 'driver' LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE 'No driver found for testing';
        RETURN;
    END IF;
    
    -- Create a test ride
    INSERT INTO rides (
        id, child_id, parent_id, driver_id, 
        origin_lat, origin_lng, origin_address,
        destination_lat, destination_lng, destination_address, destination_name,
        scheduled_time, status, fare, created_at, updated_at
    ) VALUES (
        gen_random_uuid(), 
        (SELECT id FROM children LIMIT 1),
        (SELECT parent_id FROM children LIMIT 1),
        test_user_id,
        '-26.2041', '28.0473', 'Test Origin',
        '-26.1941', '28.0573', 'Test Destination', 'Test School',
        NOW() + INTERVAL '1 hour', 'scheduled', 50.00, NOW(), NOW()
    ) RETURNING id INTO test_ride_id;
    
    RAISE NOTICE 'Created test ride: %', test_ride_id;
    
    -- Create a test transaction
    INSERT INTO transactions (user_id, amount, type, description, ride_id, created_at)
    VALUES (test_user_id, 50.00, 'credit', 'Test transaction', test_ride_id, NOW());
    
    RAISE NOTICE 'Created test transaction for ride: %', test_ride_id;
    
    -- Check transaction count before deletion
    SELECT COUNT(*) INTO transaction_count FROM transactions WHERE ride_id = test_ride_id;
    RAISE NOTICE 'Transactions before deletion: %', transaction_count;
    
    -- Delete the ride (this should cascade delete the transaction)
    DELETE FROM rides WHERE id = test_ride_id;
    
    RAISE NOTICE 'Deleted test ride: %', test_ride_id;
    
    -- Check transaction count after deletion
    SELECT COUNT(*) INTO transaction_count FROM transactions WHERE ride_id = test_ride_id;
    RAISE NOTICE 'Transactions after deletion: %', transaction_count;
    
    IF transaction_count = 0 THEN
        RAISE NOTICE 'SUCCESS: Foreign key cascade delete is working correctly';
    ELSE
        RAISE NOTICE 'ERROR: Foreign key cascade delete is not working';
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Test failed with error: % %', SQLSTATE, SQLERRM;
END $$;
