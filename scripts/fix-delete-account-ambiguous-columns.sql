-- Fix Delete Account Function - Resolve Ambiguous Column References
-- This function fixes the ambiguous 'user_id' column references by using proper table aliases

DROP FUNCTION IF EXISTS delete_user_account_completely(UUID);
DROP FUNCTION IF EXISTS delete_my_account();

-- Create the main deletion function with proper table aliases
CREATE OR REPLACE FUNCTION delete_user_account_completely(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_record RECORD;
    child_ids UUID[];
    car_ids UUID[];
BEGIN
    -- Get user information first
    SELECT * INTO user_record FROM users u WHERE u.id = user_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- Get child IDs for this parent (if any)
    SELECT ARRAY_AGG(c.id) INTO child_ids 
    FROM children c 
    WHERE c.parent_id = user_id_param;

    -- Get car IDs for this driver (if any)
    SELECT ARRAY_AGG(car.id) INTO car_ids 
    FROM cars car 
    WHERE car.driver_id = user_id_param;

    -- Delete from ratings table (both as rater and rated) - using table aliases
    DELETE FROM ratings r WHERE r.rater_id = user_id_param OR r.rated_id = user_id_param;

    -- Delete from messages table (both sent and received) - using table aliases
    DELETE FROM messages m WHERE m.sender_id = user_id_param OR m.recipient_id = user_id_param;

    -- Delete from notifications table - using table alias
    DELETE FROM notifications n WHERE n.user_id = user_id_param;

    -- Delete from transactions table - using table alias
    DELETE FROM transactions t WHERE t.user_id = user_id_param;

    -- Delete from completed_rides table (as parent or driver) - using table aliases
    DELETE FROM completed_rides cr WHERE cr.parent_id = user_id_param OR cr.driver_id = user_id_param;

    -- Delete from cancelled_rides table (as parent or driver) - using table aliases
    DELETE FROM cancelled_rides canr WHERE canr.parent_id = user_id_param OR canr.driver_id = user_id_param;

    -- Delete from active rides table (as parent or driver) - using table aliases
    DELETE FROM rides r WHERE r.parent_id = user_id_param OR r.driver_id = user_id_param;

    -- Delete from ride_requests table (as parent) - using table alias
    DELETE FROM ride_requests rr WHERE rr.parent_id = user_id_param;

    -- Delete children records - using table alias
    IF child_ids IS NOT NULL THEN
        DELETE FROM children c WHERE c.parent_id = user_id_param;
    END IF;

    -- Delete car records - using table alias
    IF car_ids IS NOT NULL THEN
        DELETE FROM cars car WHERE car.driver_id = user_id_param;
    END IF;

    -- Delete from payment_cards table (if exists) - using table alias
    DELETE FROM payment_cards pc WHERE pc.user_id = user_id_param;

    -- Delete from OTP codes table (if exists) - using table alias
    DELETE FROM otp_codes otp WHERE otp.email = user_record.email;

    -- Delete from geocoded_addresses table (if exists and has user association) - using table alias
    -- This is optional as geocoded addresses might be shared
    DELETE FROM geocoded_addresses ga WHERE ga.created_by = user_id_param;

    -- Finally, delete the user record - using table alias
    DELETE FROM users u WHERE u.id = user_id_param;

    RETURN TRUE;

EXCEPTION
    WHEN OTHERS THEN
        -- Log the error and re-raise
        RAISE EXCEPTION 'Error deleting user account: %', SQLERRM;
        RETURN FALSE;
END;
$$;

-- Create a wrapper function that checks if the user is deleting their own account
CREATE OR REPLACE FUNCTION delete_my_account()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Get the current user ID from auth context
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Call the main deletion function
    RETURN delete_user_account_completely(current_user_id);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_account_completely(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_my_account() TO authenticated;

-- Test the function (optional)
-- SELECT delete_my_account();
