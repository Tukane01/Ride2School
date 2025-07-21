-- Drop existing function if it exists
DROP FUNCTION IF EXISTS delete_user_account(UUID);
DROP FUNCTION IF EXISTS delete_my_account();

-- Create the delete_my_account function that uses auth.uid()
CREATE OR REPLACE FUNCTION delete_my_account()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id UUID;
  user_type_val VARCHAR(10);
BEGIN
  -- Get the current user ID from auth
  user_id := auth.uid();
  
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Get user type
  SELECT user_type INTO user_type_val FROM users WHERE id = user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Check for active rides
  IF EXISTS (SELECT 1 FROM rides WHERE (parent_id = user_id OR driver_id = user_id) AND status IN ('scheduled', 'in_progress')) THEN
    RAISE EXCEPTION 'Cannot delete account with active rides. Please complete or cancel all active rides first.';
  END IF;
  
  -- Update any existing transactions to remove user references
  UPDATE transactions 
  SET description = CONCAT(COALESCE(description, ''), ' (User account deleted)')
  WHERE user_id = user_id;
  
  -- Update any existing ratings to remove user references
  UPDATE ratings 
  SET rater_id = NULL
  WHERE rater_id = user_id;
  
  UPDATE ratings 
  SET rated_id = NULL
  WHERE rated_id = user_id;
  
  -- Update any existing messages to remove user references
  UPDATE messages 
  SET archived = TRUE
  WHERE sender_id = user_id OR recipient_id = user_id;
  
  -- Update any existing notifications to remove user references
  UPDATE notifications 
  SET archived = TRUE
  WHERE user_id = user_id;
  
  -- Delete user-specific data
  DELETE FROM payment_cards WHERE user_id = user_id;
  DELETE FROM cars WHERE driver_id = user_id;
  DELETE FROM children WHERE parent_id = user_id;
  
  -- Finally delete the user
  DELETE FROM users WHERE id = user_id;
  
  RETURN TRUE;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to delete account: %', SQLERRM;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION delete_my_account() TO authenticated;
