-- Enhanced Transaction System for Complete Data Integrity
-- This script ensures accurate and up-to-date transaction history

-- Drop existing constraints and recreate with proper relationships
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_ride_id_fkey;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;

-- Add proper foreign key constraints
ALTER TABLE transactions 
ADD CONSTRAINT transactions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add ride_id as optional reference (can be null for non-ride transactions)
ALTER TABLE transactions 
ADD CONSTRAINT transactions_ride_id_fkey 
FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE SET NULL;

-- Ensure all required columns exist with proper types
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(50) DEFAULT 'general',
ADD COLUMN IF NOT EXISTS reference_id UUID,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'completed',
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS fee_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS net_amount DECIMAL(10,2);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_reference_id ON transactions(reference_id);

-- Create comprehensive transaction logging function
CREATE OR REPLACE FUNCTION create_transaction_record(
    p_user_id UUID,
    p_amount DECIMAL(10,2),
    p_type VARCHAR(10), -- 'credit' or 'debit'
    p_description TEXT,
    p_transaction_type VARCHAR(50) DEFAULT 'general',
    p_ride_id UUID DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}',
    p_fee_amount DECIMAL(10,2) DEFAULT 0.00
) RETURNS UUID AS $$
DECLARE
    v_transaction_id UUID;
    v_net_amount DECIMAL(10,2);
    v_current_balance DECIMAL(10,2);
    v_new_balance DECIMAL(10,2);
BEGIN
    -- Calculate net amount (amount minus fees)
    v_net_amount := p_amount - COALESCE(p_fee_amount, 0.00);
    
    -- Get current wallet balance
    SELECT COALESCE(wallet_balance, 0.00) INTO v_current_balance
    FROM users WHERE id = p_user_id;
    
    -- Calculate new balance
    IF p_type = 'credit' THEN
        v_new_balance := v_current_balance + v_net_amount;
    ELSE
        v_new_balance := v_current_balance - p_amount; -- Use full amount for debits
    END IF;
    
    -- Validate sufficient funds for debits
    IF p_type = 'debit' AND v_new_balance < 0 THEN
        RAISE EXCEPTION 'Insufficient funds. Current balance: %, Required: %', v_current_balance, p_amount;
    END IF;
    
    -- Create transaction record
    INSERT INTO transactions (
        user_id,
        amount,
        type,
        description,
        transaction_type,
        ride_id,
        reference_id,
        metadata,
        status,
        fee_amount,
        net_amount,
        created_at,
        processed_at
    ) VALUES (
        p_user_id,
        p_amount,
        p_type,
        p_description,
        p_transaction_type,
        p_ride_id,
        p_reference_id,
        p_metadata,
        'completed',
        COALESCE(p_fee_amount, 0.00),
        v_net_amount,
        NOW(),
        NOW()
    ) RETURNING id INTO v_transaction_id;
    
    -- Update user wallet balance
    UPDATE users 
    SET wallet_balance = v_new_balance,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Log the balance change
    INSERT INTO wallet_balance_history (
        user_id,
        transaction_id,
        previous_balance,
        new_balance,
        change_amount,
        change_type,
        created_at
    ) VALUES (
        p_user_id,
        v_transaction_id,
        v_current_balance,
        v_new_balance,
        CASE WHEN p_type = 'credit' THEN v_net_amount ELSE -p_amount END,
        p_type,
        NOW()
    );
    
    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Create wallet balance history table for audit trail
CREATE TABLE IF NOT EXISTS wallet_balance_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    previous_balance DECIMAL(10,2) NOT NULL,
    new_balance DECIMAL(10,2) NOT NULL,
    change_amount DECIMAL(10,2) NOT NULL,
    change_type VARCHAR(10) NOT NULL CHECK (change_type IN ('credit', 'debit')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for wallet balance history
CREATE INDEX IF NOT EXISTS idx_wallet_balance_history_user_id ON wallet_balance_history(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_balance_history_created_at ON wallet_balance_history(created_at);

-- Enhanced ride completion function with proper transaction handling
CREATE OR REPLACE FUNCTION complete_ride_with_accurate_transactions(
    p_ride_id UUID,
    p_driver_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_ride_record RECORD;
    v_parent_transaction_id UUID;
    v_driver_transaction_id UUID;
    v_platform_fee DECIMAL(10,2);
    v_driver_earnings DECIMAL(10,2);
    v_result JSONB;
BEGIN
    -- Get ride details with lock
    SELECT * INTO v_ride_record
    FROM rides 
    WHERE id = p_ride_id AND driver_id = p_driver_id AND status = 'in_progress'
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Ride not found or cannot be completed'
        );
    END IF;
    
    -- Calculate platform fee (5% of fare)
    v_platform_fee := ROUND(v_ride_record.fare * 0.05, 2);
    v_driver_earnings := v_ride_record.fare - v_platform_fee;
    
    -- Create parent transaction (debit for ride payment)
    v_parent_transaction_id := create_transaction_record(
        p_user_id := v_ride_record.parent_id,
        p_amount := v_ride_record.fare,
        p_type := 'debit',
        p_description := format('Ride payment - %s to %s', 
            v_ride_record.origin_address, 
            v_ride_record.destination_address),
        p_transaction_type := 'ride_payment',
        p_ride_id := p_ride_id,
        p_reference_id := p_ride_id,
        p_metadata := jsonb_build_object(
            'ride_id', p_ride_id,
            'driver_id', p_driver_id,
            'fare', v_ride_record.fare,
            'platform_fee', v_platform_fee,
            'completion_time', NOW()
        )
    );
    
    -- Create driver transaction (credit for earnings)
    v_driver_transaction_id := create_transaction_record(
        p_user_id := p_driver_id,
        p_amount := v_ride_record.fare,
        p_type := 'credit',
        p_description := format('Ride earnings - %s to %s', 
            v_ride_record.origin_address, 
            v_ride_record.destination_address),
        p_transaction_type := 'ride_earnings',
        p_ride_id := p_ride_id,
        p_reference_id := p_ride_id,
        p_metadata := jsonb_build_object(
            'ride_id', p_ride_id,
            'parent_id', v_ride_record.parent_id,
            'gross_fare', v_ride_record.fare,
            'platform_fee', v_platform_fee,
            'net_earnings', v_driver_earnings,
            'completion_time', NOW()
        ),
        p_fee_amount := v_platform_fee
    );
    
    -- Move ride to completed_rides table
    INSERT INTO completed_rides (
        original_ride_id, parent_id, driver_id, child_id,
        origin_lat, origin_lng, origin_address,
        destination_lat, destination_lng, destination_address, destination_name,
        scheduled_time, completed_at, fare, otp,
        current_location_lat, current_location_lng, current_location_address,
        estimated_arrival, parent_transaction_id, driver_transaction_id
    ) VALUES (
        v_ride_record.id, v_ride_record.parent_id, v_ride_record.driver_id, v_ride_record.child_id,
        v_ride_record.origin_lat, v_ride_record.origin_lng, v_ride_record.origin_address,
        v_ride_record.destination_lat, v_ride_record.destination_lng, 
        v_ride_record.destination_address, v_ride_record.destination_name,
        v_ride_record.scheduled_time, NOW(), v_ride_record.fare, v_ride_record.otp,
        v_ride_record.current_location_lat, v_ride_record.current_location_lng, 
        v_ride_record.current_location_address,
        v_ride_record.estimated_arrival, v_parent_transaction_id, v_driver_transaction_id
    );
    
    -- Archive related messages
    UPDATE messages 
    SET archived = true, archived_at = NOW()
    WHERE ride_id = p_ride_id;
    
    -- Update notifications to remove ride reference
    UPDATE notifications 
    SET ride_id = NULL, 
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('original_ride_id', p_ride_id)
    WHERE ride_id = p_ride_id;
    
    -- Delete from active rides table
    DELETE FROM rides WHERE id = p_ride_id;
    
    -- Update user statistics
    UPDATE users 
    SET total_completed_rides = COALESCE(total_completed_rides, 0) + 1,
        updated_at = NOW()
    WHERE id IN (v_ride_record.parent_id, p_driver_id);
    
    v_result := jsonb_build_object(
        'success', true,
        'message', 'Ride completed successfully',
        'ride_id', p_ride_id,
        'fare', v_ride_record.fare,
        'platform_fee', v_platform_fee,
        'driver_earnings', v_driver_earnings,
        'parent_transaction_id', v_parent_transaction_id,
        'driver_transaction_id', v_driver_transaction_id,
        'completed_at', NOW()
    );
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'error_code', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql;

-- Enhanced ride cancellation function with proper transaction handling
CREATE OR REPLACE FUNCTION cancel_ride_with_accurate_transactions(
    p_ride_id UUID,
    p_cancelled_by UUID,
    p_cancellation_reason TEXT DEFAULT 'No reason provided'
) RETURNS JSONB AS $$
DECLARE
    v_ride_record RECORD;
    v_cancellation_fee DECIMAL(10,2) := 0.00;
    v_transaction_id UUID;
    v_cancelled_by_type VARCHAR(10);
    v_result JSONB;
BEGIN
    -- Get ride details with lock
    SELECT * INTO v_ride_record
    FROM rides 
    WHERE id = p_ride_id AND status IN ('scheduled', 'in_progress')
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Ride not found or cannot be cancelled'
        );
    END IF;
    
    -- Determine cancellation type and fee
    SELECT user_type INTO v_cancelled_by_type
    FROM users WHERE id = p_cancelled_by;
    
    -- Calculate cancellation fee based on timing and who cancelled
    IF v_ride_record.status = 'in_progress' THEN
        v_cancellation_fee := 25.00; -- Higher fee for in-progress cancellations
    ELSIF EXTRACT(EPOCH FROM (v_ride_record.scheduled_time - NOW())) < 1800 THEN -- Less than 30 minutes
        v_cancellation_fee := 15.00; -- Fee for late cancellations
    ELSE
        v_cancellation_fee := 0.00; -- No fee for early cancellations
    END IF;
    
    -- Apply cancellation fee if applicable
    IF v_cancellation_fee > 0 THEN
        v_transaction_id := create_transaction_record(
            p_user_id := p_cancelled_by,
            p_amount := v_cancellation_fee,
            p_type := 'debit',
            p_description := format('Cancellation fee - %s', p_cancellation_reason),
            p_transaction_type := 'cancellation_fee',
            p_ride_id := p_ride_id,
            p_reference_id := p_ride_id,
            p_metadata := jsonb_build_object(
                'ride_id', p_ride_id,
                'cancelled_by', p_cancelled_by,
                'cancelled_by_type', v_cancelled_by_type,
                'cancellation_reason', p_cancellation_reason,
                'original_fare', v_ride_record.fare,
                'cancellation_time', NOW()
            )
        );
    END IF;
    
    -- Move ride to cancelled_rides table
    INSERT INTO cancelled_rides (
        original_ride_id, parent_id, driver_id, child_id,
        origin_lat, origin_lng, origin_address,
        destination_lat, destination_lng, destination_address, destination_name,
        scheduled_time, cancelled_at, cancelled_by, cancellation_reason, fare, otp,
        current_location_lat, current_location_lng, current_location_address,
        estimated_arrival, cancellation_fee, cancellation_transaction_id
    ) VALUES (
        v_ride_record.id, v_ride_record.parent_id, v_ride_record.driver_id, v_ride_record.child_id,
        v_ride_record.origin_lat, v_ride_record.origin_lng, v_ride_record.origin_address,
        v_ride_record.destination_lat, v_ride_record.destination_lng, 
        v_ride_record.destination_address, v_ride_record.destination_name,
        v_ride_record.scheduled_time, NOW(), p_cancelled_by, p_cancellation_reason, 
        v_ride_record.fare, v_ride_record.otp,
        v_ride_record.current_location_lat, v_ride_record.current_location_lng, 
        v_ride_record.current_location_address,
        v_ride_record.estimated_arrival, v_cancellation_fee, v_transaction_id
    );
    
    -- Archive related messages
    UPDATE messages 
    SET archived = true, archived_at = NOW()
    WHERE ride_id = p_ride_id;
    
    -- Update notifications to remove ride reference
    UPDATE notifications 
    SET ride_id = NULL,
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('original_ride_id', p_ride_id)
    WHERE ride_id = p_ride_id;
    
    -- Delete from active rides table
    DELETE FROM rides WHERE id = p_ride_id;
    
    -- Update user statistics
    UPDATE users 
    SET total_cancellations = COALESCE(total_cancellations, 0) + 1,
        cancellation_rate = ROUND(
            (COALESCE(total_cancellations, 0) + 1) * 100.0 / 
            GREATEST(COALESCE(total_ride_requests, 0), 1), 2
        ),
        updated_at = NOW()
    WHERE id = p_cancelled_by;
    
    v_result := jsonb_build_object(
        'success', true,
        'message', 'Ride cancelled successfully',
        'ride_id', p_ride_id,
        'cancelled_by', p_cancelled_by,
        'cancelled_by_type', v_cancelled_by_type,
        'cancellation_fee', v_cancellation_fee,
        'cancellation_transaction_id', v_transaction_id,
        'cancelled_at', NOW()
    );
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'error_code', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql;

-- Function to add funds with proper transaction tracking
CREATE OR REPLACE FUNCTION add_funds_with_transaction(
    p_user_id UUID,
    p_amount DECIMAL(10,2),
    p_payment_method VARCHAR(50) DEFAULT 'card',
    p_payment_reference VARCHAR(100) DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_transaction_id UUID;
    v_processing_fee DECIMAL(10,2);
    v_result JSONB;
BEGIN
    -- Validate amount
    IF p_amount < 10.00 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Minimum amount is R10.00'
        );
    END IF;
    
    IF p_amount > 10000.00 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Maximum amount is R10,000.00 per transaction'
        );
    END IF;
    
    -- Calculate processing fee (2.5% for card payments)
    v_processing_fee := CASE 
        WHEN p_payment_method = 'card' THEN ROUND(p_amount * 0.025, 2)
        ELSE 0.00
    END;
    
    -- Create transaction record
    v_transaction_id := create_transaction_record(
        p_user_id := p_user_id,
        p_amount := p_amount,
        p_type := 'credit',
        p_description := format('Funds added via %s', p_payment_method),
        p_transaction_type := 'wallet_topup',
        p_reference_id := gen_random_uuid(),
        p_metadata := jsonb_build_object(
            'payment_method', p_payment_method,
            'payment_reference', p_payment_reference,
            'processing_fee', v_processing_fee,
            'gross_amount', p_amount,
            'net_amount', p_amount - v_processing_fee
        ),
        p_fee_amount := v_processing_fee
    );
    
    v_result := jsonb_build_object(
        'success', true,
        'message', 'Funds added successfully',
        'transaction_id', v_transaction_id,
        'amount', p_amount,
        'processing_fee', v_processing_fee,
        'net_amount', p_amount - v_processing_fee
    );
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'error_code', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql;

-- Function to withdraw funds with proper transaction tracking
CREATE OR REPLACE FUNCTION withdraw_funds_with_transaction(
    p_user_id UUID,
    p_amount DECIMAL(10,2),
    p_withdrawal_method VARCHAR(50) DEFAULT 'bank_transfer',
    p_account_reference VARCHAR(100) DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_transaction_id UUID;
    v_withdrawal_fee DECIMAL(10,2);
    v_result JSONB;
BEGIN
    -- Validate amount
    IF p_amount < 50.00 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Minimum withdrawal amount is R50.00'
        );
    END IF;
    
    IF p_amount > 5000.00 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Maximum withdrawal amount is R5,000.00 per transaction'
        );
    END IF;
    
    -- Calculate withdrawal fee
    v_withdrawal_fee := CASE 
        WHEN p_withdrawal_method = 'bank_transfer' THEN 15.00
        WHEN p_withdrawal_method = 'instant_eft' THEN 25.00
        ELSE 10.00
    END;
    
    -- Create transaction record (this will validate sufficient funds)
    v_transaction_id := create_transaction_record(
        p_user_id := p_user_id,
        p_amount := p_amount + v_withdrawal_fee, -- Total amount including fee
        p_type := 'debit',
        p_description := format('Funds withdrawn via %s', p_withdrawal_method),
        p_transaction_type := 'wallet_withdrawal',
        p_reference_id := gen_random_uuid(),
        p_metadata := jsonb_build_object(
            'withdrawal_method', p_withdrawal_method,
            'account_reference', p_account_reference,
            'withdrawal_fee', v_withdrawal_fee,
            'requested_amount', p_amount,
            'total_deducted', p_amount + v_withdrawal_fee
        )
    );
    
    v_result := jsonb_build_object(
        'success', true,
        'message', 'Withdrawal processed successfully',
        'transaction_id', v_transaction_id,
        'amount', p_amount,
        'withdrawal_fee', v_withdrawal_fee,
        'total_deducted', p_amount + v_withdrawal_fee
    );
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'error_code', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql;

-- Add missing columns to completed_rides and cancelled_rides tables
ALTER TABLE completed_rides 
ADD COLUMN IF NOT EXISTS parent_transaction_id UUID REFERENCES transactions(id),
ADD COLUMN IF NOT EXISTS driver_transaction_id UUID REFERENCES transactions(id);

ALTER TABLE cancelled_rides 
ADD COLUMN IF NOT EXISTS cancellation_fee DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS cancellation_transaction_id UUID REFERENCES transactions(id);

-- Create comprehensive transaction view for reporting
CREATE OR REPLACE VIEW transaction_details AS
SELECT 
    t.id,
    t.user_id,
    u.name || ' ' || u.surname as user_name,
    u.user_type,
    t.amount,
    t.type,
    t.description,
    t.transaction_type,
    t.ride_id,
    t.reference_id,
    t.metadata,
    t.status,
    t.fee_amount,
    t.net_amount,
    t.created_at,
    t.processed_at,
    -- Additional context from rides if applicable
    CASE 
        WHEN t.ride_id IS NOT NULL THEN
            COALESCE(
                (SELECT 'Active: ' || origin_address || ' → ' || destination_address FROM rides WHERE id = t.ride_id),
                (SELECT 'Completed: ' || origin_address || ' → ' || destination_address FROM completed_rides WHERE original_ride_id = t.ride_id),
                (SELECT 'Cancelled: ' || origin_address || ' → ' || destination_address FROM cancelled_rides WHERE original_ride_id = t.ride_id)
            )
        ELSE NULL
    END as ride_details
FROM transactions t
JOIN users u ON t.user_id = u.id;

-- Grant necessary permissions
GRANT SELECT ON transaction_details TO authenticated;
GRANT EXECUTE ON FUNCTION create_transaction_record TO authenticated;
GRANT EXECUTE ON FUNCTION complete_ride_with_accurate_transactions TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_ride_with_accurate_transactions TO authenticated;
GRANT EXECUTE ON FUNCTION add_funds_with_transaction TO authenticated;
GRANT EXECUTE ON FUNCTION withdraw_funds_with_transaction TO authenticated;

-- Create trigger to automatically update user statistics
CREATE OR REPLACE FUNCTION update_user_transaction_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update user's transaction statistics
    UPDATE users 
    SET 
        total_transactions = (
            SELECT COUNT(*) FROM transactions WHERE user_id = NEW.user_id
        ),
        total_credits = (
            SELECT COALESCE(SUM(amount), 0) FROM transactions 
            WHERE user_id = NEW.user_id AND type = 'credit'
        ),
        total_debits = (
            SELECT COALESCE(SUM(amount), 0) FROM transactions 
            WHERE user_id = NEW.user_id AND type = 'debit'
        ),
        updated_at = NOW()
    WHERE id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_user_transaction_stats ON transactions;
CREATE TRIGGER trigger_update_user_transaction_stats
    AFTER INSERT ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_transaction_stats();

-- Add missing columns to users table for statistics
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS total_transactions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_credits DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_debits DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_completed_rides INTEGER DEFAULT 0;
