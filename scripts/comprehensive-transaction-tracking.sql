-- Comprehensive transaction tracking for accurate money flow

-- Ensure transaction_type and flow_direction columns exist
DO $$ 
BEGIN
    -- Add transaction_type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'transactions' AND column_name = 'transaction_type') THEN
        ALTER TABLE transactions ADD COLUMN transaction_type VARCHAR(50);
    END IF;
    
    -- Add flow_direction column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'transactions' AND column_name = 'flow_direction') THEN
        ALTER TABLE transactions ADD COLUMN flow_direction VARCHAR(10);
    END IF;
END $$;

-- Function to determine money flow direction
CREATE OR REPLACE FUNCTION get_money_flow_direction(
    transaction_type_param TEXT,
    amount_param DECIMAL,
    description_param TEXT
) RETURNS TEXT AS $$
BEGIN
    -- Money coming into wallet (Money In)
    IF transaction_type_param = 'credit' OR 
       amount_param > 0 OR
       description_param ILIKE '%ride completed%' OR
       description_param ILIKE '%earnings%' OR
       description_param ILIKE '%bonus%' OR
       description_param ILIKE '%refund%' OR
       description_param ILIKE '%added%' OR
       description_param ILIKE '%deposit%' OR
       description_param ILIKE '%topup%' OR
       description_param ILIKE '%top-up%' THEN
        RETURN 'in';
    END IF;
    
    -- Money going out of wallet (Money Out)
    IF transaction_type_param = 'debit' OR 
       amount_param < 0 OR
       description_param ILIKE '%withdrawal%' OR
       description_param ILIKE '%fine%' OR
       description_param ILIKE '%penalty%' OR
       description_param ILIKE '%cancellation%' OR
       description_param ILIKE '%fee%' OR
       description_param ILIKE '%charge%' THEN
        RETURN 'out';
    END IF;
    
    -- Default based on type
    RETURN CASE WHEN transaction_type_param = 'credit' THEN 'in' ELSE 'out' END;
END;
$$ LANGUAGE plpgsql;

-- Function to categorize transactions accurately
CREATE OR REPLACE FUNCTION categorize_transaction_comprehensive(
    description_param TEXT,
    type_param TEXT,
    amount_param DECIMAL
) RETURNS TEXT AS $$
BEGIN
    -- Ride-related earnings
    IF description_param ILIKE '%ride completed%' OR 
       description_param ILIKE '%ride earnings%' OR
       description_param ILIKE '%trip completed%' THEN
        RETURN 'ride_earnings';
    END IF;
    
    -- Wallet deposits (money added)
    IF description_param ILIKE '%added%' OR 
       description_param ILIKE '%deposit%' OR 
       description_param ILIKE '%topup%' OR
       description_param ILIKE '%top-up%' OR
       description_param ILIKE '%funds added%' THEN
        RETURN 'wallet_deposit';
    END IF;
    
    -- Wallet withdrawals (money taken out)
    IF description_param ILIKE '%withdrawal%' OR 
       description_param ILIKE '%withdraw%' OR
       description_param ILIKE '%funds withdrawn%' THEN
        RETURN 'wallet_withdrawal';
    END IF;
    
    -- Cancellation penalties
    IF description_param ILIKE '%cancellation%' THEN
        RETURN 'cancellation_fee';
    END IF;
    
    -- Policy fines and penalties
    IF description_param ILIKE '%fine%' OR 
       description_param ILIKE '%penalty%' OR
       description_param ILIKE '%violation%' THEN
        RETURN 'policy_fine';
    END IF;
    
    -- Bonuses and incentives
    IF description_param ILIKE '%bonus%' OR 
       description_param ILIKE '%incentive%' OR
       description_param ILIKE '%reward%' THEN
        RETURN 'bonus';
    END IF;
    
    -- Refunds
    IF description_param ILIKE '%refund%' THEN
        RETURN 'refund';
    END IF;
    
    -- Service fees
    IF description_param ILIKE '%fee%' OR 
       description_param ILIKE '%charge%' THEN
        RETURN 'service_fee';
    END IF;
    
    -- Default category
    RETURN 'other';
END;
$$ LANGUAGE plpgsql;

-- Update existing transactions with proper categorization
UPDATE transactions 
SET 
    transaction_type = categorize_transaction_comprehensive(description, type, amount),
    flow_direction = get_money_flow_direction(type, amount, description)
WHERE transaction_type IS NULL OR flow_direction IS NULL;

-- Create comprehensive trigger for new transactions
CREATE OR REPLACE FUNCTION trigger_categorize_transaction_comprehensive()
RETURNS TRIGGER AS $$
BEGIN
    -- Set transaction type
    NEW.transaction_type = categorize_transaction_comprehensive(NEW.description, NEW.type, NEW.amount);
    
    -- Set flow direction
    NEW.flow_direction = get_money_flow_direction(NEW.type, NEW.amount, NEW.description);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger and create new one
DROP TRIGGER IF EXISTS trigger_categorize_transaction ON transactions;
DROP TRIGGER IF EXISTS trigger_categorize_transaction_comprehensive ON transactions;

CREATE TRIGGER trigger_categorize_transaction_comprehensive
    BEFORE INSERT ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_categorize_transaction_comprehensive();

-- Create comprehensive indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_flow_date 
ON transactions(user_id, flow_direction, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_type_flow 
ON transactions(transaction_type, flow_direction);

CREATE INDEX IF NOT EXISTS idx_transactions_user_type_flow 
ON transactions(user_id, transaction_type, flow_direction, created_at DESC);

-- Create sample transactions for testing (only if no transactions exist for drivers)
DO $$
DECLARE
    driver_record RECORD;
    transaction_count INTEGER;
BEGIN
    -- Loop through all drivers
    FOR driver_record IN SELECT id, name FROM users WHERE user_type = 'driver' LOOP
        -- Check if driver has any transactions
        SELECT COUNT(*) INTO transaction_count 
        FROM transactions 
        WHERE user_id = driver_record.id;
        
        -- Only add sample transactions if driver has none
        IF transaction_count = 0 THEN
            -- Sample ride earnings (Money In)
            INSERT INTO transactions (user_id, amount, type, description, transaction_type, flow_direction, created_at)
            VALUES 
                (driver_record.id, 75.00, 'credit', 'Ride completed - Trip #12345', 'ride_earnings', 'in', NOW() - INTERVAL '1 day'),
                (driver_record.id, 82.50, 'credit', 'Ride completed - Trip #12346', 'ride_earnings', 'in', NOW() - INTERVAL '2 days'),
                (driver_record.id, 65.00, 'credit', 'Ride completed - Trip #12347', 'ride_earnings', 'in', NOW() - INTERVAL '3 days');
            
            -- Sample wallet deposit (Money In)
            INSERT INTO transactions (user_id, amount, type, description, transaction_type, flow_direction, created_at)
            VALUES 
                (driver_record.id, 100.00, 'credit', 'Funds added to wallet via bank transfer', 'wallet_deposit', 'in', NOW() - INTERVAL '5 days');
            
            -- Sample cancellation fine (Money Out)
            INSERT INTO transactions (user_id, amount, type, description, transaction_type, flow_direction, created_at)
            VALUES 
                (driver_record.id, 25.00, 'debit', 'Cancellation fine - Late cancellation penalty', 'cancellation_fee', 'out', NOW() - INTERVAL '4 days');
            
            -- Sample policy fine (Money Out)
            INSERT INTO transactions (user_id, amount, type, description, transaction_type, flow_direction, created_at)
            VALUES 
                (driver_record.id, 50.00, 'debit', 'Policy violation fine - Inappropriate behavior', 'policy_fine', 'out', NOW() - INTERVAL '6 days');
            
            -- Sample wallet withdrawal (Money Out)
            INSERT INTO transactions (user_id, amount, type, description, transaction_type, flow_direction, created_at)
            VALUES 
                (driver_record.id, 200.00, 'debit', 'Funds withdrawn from wallet to bank account', 'wallet_withdrawal', 'out', NOW() - INTERVAL '7 days');
            
            -- Sample bonus (Money In)
            INSERT INTO transactions (user_id, amount, type, description, transaction_type, flow_direction, created_at)
            VALUES 
                (driver_record.id, 30.00, 'credit', 'Performance bonus - 5 star rating streak', 'bonus', 'in', NOW() - INTERVAL '8 days');
        END IF;
    END LOOP;
END $$;

-- Create comprehensive view for driver transaction analysis
CREATE OR REPLACE VIEW driver_transaction_analysis AS
SELECT 
    u.id as driver_id,
    u.name as driver_name,
    u.surname as driver_surname,
    
    -- Money In totals
    COALESCE(SUM(CASE WHEN t.flow_direction = 'in' THEN t.amount ELSE 0 END), 0) as total_money_in,
    COALESCE(SUM(CASE WHEN t.transaction_type = 'ride_earnings' THEN t.amount ELSE 0 END), 0) as total_ride_earnings,
    COALESCE(SUM(CASE WHEN t.transaction_type = 'wallet_deposit' THEN t.amount ELSE 0 END), 0) as total_wallet_deposits,
    COALESCE(SUM(CASE WHEN t.transaction_type = 'bonus' THEN t.amount ELSE 0 END), 0) as total_bonuses,
    COALESCE(SUM(CASE WHEN t.transaction_type = 'refund' THEN t.amount ELSE 0 END), 0) as total_refunds,
    
    -- Money Out totals
    COALESCE(SUM(CASE WHEN t.flow_direction = 'out' THEN t.amount ELSE 0 END), 0) as total_money_out,
    COALESCE(SUM(CASE WHEN t.transaction_type = 'wallet_withdrawal' THEN t.amount ELSE 0 END), 0) as total_withdrawals,
    COALESCE(SUM(CASE WHEN t.transaction_type = 'cancellation_fee' THEN t.amount ELSE 0 END), 0) as total_cancellation_fines,
    COALESCE(SUM(CASE WHEN t.transaction_type = 'policy_fine' THEN t.amount ELSE 0 END), 0) as total_policy_fines,
    COALESCE(SUM(CASE WHEN t.transaction_type = 'service_fee' THEN t.amount ELSE 0 END), 0) as total_service_fees,
    
    -- Net calculations
    COALESCE(SUM(CASE WHEN t.flow_direction = 'in' THEN t.amount ELSE -t.amount END), 0) as net_amount,
    COUNT(t.id) as total_transactions,
    COUNT(CASE WHEN t.flow_direction = 'in' THEN 1 END) as money_in_count,
    COUNT(CASE WHEN t.flow_direction = 'out' THEN 1 END) as money_out_count,
    
    -- Current wallet balance
    u.wallet_balance as current_wallet_balance
    
FROM users u
LEFT JOIN transactions t ON u.id = t.user_id
WHERE u.user_type = 'driver'
GROUP BY u.id, u.name, u.surname, u.wallet_balance;

-- Grant permissions
GRANT SELECT ON driver_transaction_analysis TO authenticated;

-- Create function to get driver transaction summary by date range
CREATE OR REPLACE FUNCTION get_driver_transaction_summary(
    driver_id_param UUID,
    start_date_param TIMESTAMP DEFAULT NULL,
    end_date_param TIMESTAMP DEFAULT NULL
) RETURNS TABLE (
    total_money_in DECIMAL,
    total_money_out DECIMAL,
    net_amount DECIMAL,
    ride_earnings DECIMAL,
    wallet_deposits DECIMAL,
    bonuses DECIMAL,
    refunds DECIMAL,
    wallet_withdrawals DECIMAL,
    cancellation_fines DECIMAL,
    policy_fines DECIMAL,
    service_fees DECIMAL,
    transaction_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(CASE WHEN t.flow_direction = 'in' THEN t.amount ELSE 0 END), 0) as total_money_in,
        COALESCE(SUM(CASE WHEN t.flow_direction = 'out' THEN t.amount ELSE 0 END), 0) as total_money_out,
        COALESCE(SUM(CASE WHEN t.flow_direction = 'in' THEN t.amount ELSE -t.amount END), 0) as net_amount,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'ride_earnings' THEN t.amount ELSE 0 END), 0) as ride_earnings,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'wallet_deposit' THEN t.amount ELSE 0 END), 0) as wallet_deposits,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'bonus' THEN t.amount ELSE 0 END), 0) as bonuses,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'refund' THEN t.amount ELSE 0 END), 0) as refunds,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'wallet_withdrawal' THEN t.amount ELSE 0 END), 0) as wallet_withdrawals,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'cancellation_fee' THEN t.amount ELSE 0 END), 0) as cancellation_fines,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'policy_fine' THEN t.amount ELSE 0 END), 0) as policy_fines,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'service_fee' THEN t.amount ELSE 0 END), 0) as service_fees,
        COUNT(t.id) as transaction_count
    FROM transactions t
    WHERE t.user_id = driver_id_param
    AND (start_date_param IS NULL OR t.created_at >= start_date_param)
    AND (end_date_param IS NULL OR t.created_at <= end_date_param);
END;
$$ LANGUAGE plpgsql;

COMMIT;
