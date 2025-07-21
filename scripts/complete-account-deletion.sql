-- Complete Account Deletion Function
-- This function will permanently delete all data associated with a user account

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
    SELECT * INTO user_record FROM users WHERE id = user_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- Get child IDs for this parent (if any)
    SELECT ARRAY_AGG(id) INTO child_ids 
    FROM children 
    WHERE parent_id = user_id_param;

    -- Get car IDs for this driver (if any)
    SELECT ARRAY_AGG(id) INTO car_ids 
    FROM cars 
    WHERE driver_id = user_id_param;

    -- Delete from ratings table (both as rater and rated)
    DELETE FROM ratings WHERE rater_id = user_id_param OR rated_id = user_id_param;

    -- Delete from messages table (both sent and received)
    DELETE FROM messages WHERE sender_id = user_id_param OR recipient_id = user_id_param;

    -- Delete from notifications table
    DELETE FROM notifications WHERE user_id = user_id_param;

    -- Delete from transactions table
    DELETE FROM transactions WHERE user_id = user_id_param;

    -- Delete from completed_rides table (as parent or driver)
    DELETE FROM completed_rides WHERE parent_id = user_id_param OR driver_id = user_id_param;

    -- Delete from cancelled_rides table (as parent or driver)
    DELETE FROM cancelled_rides WHERE parent_id = user_id_param OR driver_id = user_id_param;

    -- Delete from active rides table (as parent or driver)
    DELETE FROM rides WHERE parent_id = user_id_param OR driver_id = user_id_param;

    -- Delete from ride_requests table (as parent)
    DELETE FROM ride_requests WHERE parent_id = user_id_param;

    -- Delete children records
    IF child_ids IS NOT NULL THEN
        DELETE FROM children WHERE parent_id = user_id_param;
    END IF;

    -- Delete car records
    IF car_ids IS NOT NULL THEN
        DELETE FROM cars WHERE driver_id = user_id_param;
    END IF;

    -- Delete from OTP codes table (if exists)
    DELETE FROM otp_codes WHERE email = user_record.email;

    -- Delete from geocoded_addresses table (if exists and has user association)
    -- This is optional as geocoded addresses might be shared
    -- DELETE FROM geocoded_addresses WHERE created_by = user_id_param;

    -- Finally, delete the user record
    DELETE FROM users WHERE id = user_id_param;

    -- Delete from Supabase Auth (this requires admin privileges)
    -- Note: This might need to be handled separately via Supabase Admin API
    
    RETURN TRUE;

EXCEPTION
    WHEN OTHERS THEN
        -- Log the error and re-raise
        RAISE EXCEPTION 'Error deleting user account: %', SQLERRM;
        RETURN FALSE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_account_completely(UUID) TO authenticated;

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
GRANT EXECUTE ON FUNCTION delete_my_account() TO authenticated;
