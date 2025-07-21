-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS delete_user_account_completely(UUID);
DROP FUNCTION IF EXISTS delete_my_account();

-- Complete Account Deletion Function
CREATE OR REPLACE FUNCTION delete_user_account_completely(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_record RECORD;
BEGIN
    -- Get user information first
    SELECT * INTO user_record FROM users WHERE id = user_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- Start deletion process
    RAISE NOTICE 'Starting deletion for user: %', user_record.email;

    -- Delete from ratings table (both as rater and rated)
    DELETE FROM ratings WHERE rater_id = user_id_param OR rated_id = user_id_param;
    RAISE NOTICE 'Deleted ratings';

    -- Delete from messages table (both sent and received)
    DELETE FROM messages WHERE sender_id = user_id_param OR recipient_id = user_id_param;
    RAISE NOTICE 'Deleted messages';

    -- Delete from notifications table
    DELETE FROM notifications WHERE user_id = user_id_param;
    RAISE NOTICE 'Deleted notifications';

    -- Delete from transactions table
    DELETE FROM transactions WHERE user_id = user_id_param;
    RAISE NOTICE 'Deleted transactions';

    -- Delete from completed_rides table (as parent or driver)
    DELETE FROM completed_rides WHERE parent_id = user_id_param OR driver_id = user_id_param;
    RAISE NOTICE 'Deleted completed rides';

    -- Delete from cancelled_rides table (as parent or driver)
    DELETE FROM cancelled_rides WHERE parent_id = user_id_param OR driver_id = user_id_param;
    RAISE NOTICE 'Deleted cancelled rides';

    -- Delete from active rides table (as parent or driver)
    DELETE FROM rides WHERE parent_id = user_id_param OR driver_id = user_id_param;
    RAISE NOTICE 'Deleted active rides';

    -- Delete from ride_requests table (as parent)
    DELETE FROM ride_requests WHERE parent_id = user_id_param;
    RAISE NOTICE 'Deleted ride requests';

    -- Delete children records
    DELETE FROM children WHERE parent_id = user_id_param;
    RAISE NOTICE 'Deleted children records';

    -- Delete car records
    DELETE FROM cars WHERE driver_id = user_id_param;
    RAISE NOTICE 'Deleted car records';

    -- Delete from OTP codes table (if exists)
    BEGIN
        DELETE FROM otp_codes WHERE email = user_record.email;
        RAISE NOTICE 'Deleted OTP codes';
    EXCEPTION
        WHEN undefined_table THEN
            RAISE NOTICE 'OTP codes table does not exist, skipping';
    END;

    -- Finally, delete the user record
    DELETE FROM users WHERE id = user_id_param;
    RAISE NOTICE 'Deleted user record';

    RAISE NOTICE 'Account deletion completed successfully for user: %', user_record.email;
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

    RAISE NOTICE 'User % is deleting their own account', current_user_id;

    -- Call the main deletion function
    RETURN delete_user_account_completely(current_user_id);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION delete_user_account_completely(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_my_account() TO authenticated;

-- Test the function exists
SELECT 'delete_my_account function created successfully' as status;
