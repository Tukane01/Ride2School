-- Drop the table if it exists to start fresh
DROP TABLE IF EXISTS payment_cards;

-- Create payment_cards table
CREATE TABLE payment_cards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    last_four_digits VARCHAR(4) NOT NULL,
    card_brand VARCHAR(50) NOT NULL,
    expiry_month INTEGER NOT NULL CHECK (expiry_month >= 1 AND expiry_month <= 12),
    expiry_year INTEGER NOT NULL CHECK (expiry_year >= EXTRACT(YEAR FROM CURRENT_DATE)),
    cardholder_name VARCHAR(255) NOT NULL,
    bank_name VARCHAR(255) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_payment_cards_user_id ON payment_cards(user_id);
CREATE INDEX idx_payment_cards_is_default ON payment_cards(user_id, is_default);

-- Enable RLS
ALTER TABLE payment_cards ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own payment cards" ON payment_cards;
DROP POLICY IF EXISTS "Users can insert their own payment cards" ON payment_cards;
DROP POLICY IF EXISTS "Users can update their own payment cards" ON payment_cards;
DROP POLICY IF EXISTS "Users can delete their own payment cards" ON payment_cards;

-- Create RLS policies with proper WITH CHECK clauses
CREATE POLICY "Users can view their own payment cards" ON payment_cards
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payment cards" ON payment_cards
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payment cards" ON payment_cards
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payment cards" ON payment_cards
    FOR DELETE USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON payment_cards TO authenticated;
GRANT ALL ON payment_cards TO service_role;

-- Create function to ensure only one default card per user
CREATE OR REPLACE FUNCTION ensure_single_default_card()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting a card as default, unset all other default cards for this user
    IF NEW.is_default = TRUE THEN
        UPDATE payment_cards 
        SET is_default = FALSE 
        WHERE user_id = NEW.user_id AND id != NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_ensure_single_default_card ON payment_cards;
CREATE TRIGGER trigger_ensure_single_default_card
    BEFORE INSERT OR UPDATE ON payment_cards
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_default_card();

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_payment_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_payment_cards_updated_at ON payment_cards;
CREATE TRIGGER trigger_update_payment_cards_updated_at
    BEFORE UPDATE ON payment_cards
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_cards_updated_at();
