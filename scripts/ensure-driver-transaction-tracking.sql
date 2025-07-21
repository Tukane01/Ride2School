-- Ensure all driver transaction types are properly tracked and categorized

-- Add transaction_type column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'transactions' AND column_name = 'transaction_type') THEN
        ALTER TABLE transactions ADD COLUMN transaction_type VARCHAR(50);
    END IF;
END $$;

-- Update existing transactions with proper transaction types
UPDATE transactions 
SET transaction_type = CASE 
    WHEN description ILIKE '%ride completed%' OR description ILIKE '%ride earnings%' THEN 'ride_earnings'
    WHEN description ILIKE '%cancellation%' THEN 'cancellation_fee'
    WHEN description ILIKE '%fine%' OR description ILIKE '%penalty%' THEN 'policy_fine'
    WHEN description ILIKE '%withdrawal%' THEN 'wallet_withdrawal'
    WHEN description ILIKE '%added%' OR description ILIKE '%topup%' THEN 'wallet_topup'
    ELSE 'other'
END
WHERE transaction_type IS NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_type_date 
ON transactions(user_id, transaction_type, created_at DESC);

-- Create index for transaction categorization
CREATE INDEX IF NOT EXISTS idx_transactions_description 
ON transactions USING gin(to_tsvector('english', description));

-- Function to automatically categorize new transactions
CREATE OR REPLACE FUNCTION categorize_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-categorize based on description
    NEW.transaction_type = CASE 
        WHEN NEW.description ILIKE '%ride completed%' OR NEW.description ILIKE '%ride earnings%' THEN 'ride_earnings'
        WHEN NEW.description ILIKE '%cancellation%' THEN 'cancellation_fee'
        WHEN NEW.description ILIKE '%fine%' OR NEW.description ILIKE '%penalty%' THEN 'policy_fine'
        WHEN NEW.description ILIKE '%withdrawal%' THEN 'wallet_withdrawal'
        WHEN NEW.description ILIKE '%added%' OR NEW.description ILIKE '%topup%' THEN 'wallet_topup'
        ELSE 'other'
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic categorization
DROP TRIGGER IF EXISTS trigger_categorize_transaction ON transactions;
CREATE TRIGGER trigger_categorize_transaction
    BEFORE INSERT ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION categorize_transaction();

-- Create sample fine transactions for testing (if needed)
DO $$
DECLARE
    driver_id UUID;
BEGIN
    -- Get a sample driver ID
    SELECT id INTO driver_id FROM users WHERE user_type = 'driver' LIMIT 1;
    
    IF driver_id IS NOT NULL THEN
        -- Insert sample cancellation fine (only if no fines exist)
        IF NOT EXISTS (SELECT 1 FROM transactions WHERE user_id = driver_id AND description ILIKE '%cancellation%') THEN
            INSERT INTO transactions (user_id, amount, type, description, transaction_type, created_at)
            VALUES (
                driver_id,
                25.00,
                'debit',
                'Cancellation fine - Late cancellation penalty',
                'cancellation_fee',
                NOW() - INTERVAL '2 days'
            );
        END IF;
        
        -- Insert sample policy fine (only if no policy fines exist)
        IF NOT EXISTS (SELECT 1 FROM transactions WHERE user_id = driver_id AND description ILIKE '%fine%') THEN
            INSERT INTO transactions (user_id, amount, type, description, transaction_type, created_at)
            VALUES (
                driver_id,
                50.00,
                'debit',
                'Policy violation fine - Inappropriate behavior',
                'policy_fine',
                NOW() - INTERVAL '5 days'
            );
        END IF;
    END IF;
END $$;

-- Create view for driver transaction summary
CREATE OR REPLACE VIEW driver_transaction_summary AS
SELECT 
    user_id,
    COUNT(*) as total_transactions,
    SUM(CASE WHEN type = 'credit' AND transaction_type = 'ride_earnings' THEN amount ELSE 0 END) as total_ride_earnings,
    SUM(CASE WHEN type = 'debit' AND transaction_type = 'cancellation_fee' THEN amount ELSE 0 END) as total_cancellation_fines,
    SUM(CASE WHEN type = 'debit' AND transaction_type = 'policy_fine' THEN amount ELSE 0 END) as total_policy_fines,
    SUM(CASE WHEN type = 'debit' AND transaction_type = 'wallet_withdrawal' THEN amount ELSE 0 END) as total_withdrawals,
    SUM(CASE WHEN type = 'credit' AND transaction_type = 'wallet_topup' THEN amount ELSE 0 END) as total_topups,
    SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END) as net_balance_change
FROM transactions 
WHERE user_id IN (SELECT id FROM users WHERE user_type = 'driver')
GROUP BY user_id;

-- Grant necessary permissions
GRANT SELECT ON driver_transaction_summary TO authenticated;

COMMIT;
