-- Fix the last_online column issue and ensure all required columns exist
DO $$
BEGIN
  -- Check if users table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
    -- Check for last_online column
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'last_online'
    ) THEN
      ALTER TABLE users ADD COLUMN last_online TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Check for is_online column
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'is_online'
    ) THEN
      ALTER TABLE users ADD COLUMN is_online BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Check for scheduled_for_deletion column
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'scheduled_for_deletion'
    ) THEN
      ALTER TABLE users ADD COLUMN scheduled_for_deletion BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Check for deletion_date column
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'deletion_date'
    ) THEN
      ALTER TABLE users ADD COLUMN deletion_date TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Check for wallet_balance column
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'wallet_balance'
    ) THEN
      ALTER TABLE users ADD COLUMN wallet_balance DECIMAL(10, 2) DEFAULT 0.00;
    END IF;
  END IF;
END $$;
