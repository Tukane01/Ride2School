-- Create utility functions for the application

-- Function to update driver's last online timestamp
CREATE OR REPLACE FUNCTION update_driver_last_online(
  driver_id UUID,
  current_time TIMESTAMP WITH TIME ZONE
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE users 
  SET last_online = current_time 
  WHERE id = driver_id AND user_type = 'driver';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to get driver statistics
CREATE OR REPLACE FUNCTION get_driver_stats(driver_id UUID)
RETURNS JSON AS $$
DECLARE
  total_rides INTEGER;
  completed_rides INTEGER;
  cancelled_rides INTEGER;
  total_earnings DECIMAL(10,2);
  avg_rating DECIMAL(3,2);
  result JSON;
BEGIN
  -- Get completed rides count and earnings
  SELECT COUNT(*), COALESCE(SUM(fare), 0)
  INTO completed_rides, total_earnings
  FROM completed_rides 
  WHERE driver_id = get_driver_stats.driver_id;
  
  -- Get cancelled rides count
  SELECT COUNT(*)
  INTO cancelled_rides
  FROM cancelled_rides 
  WHERE driver_id = get_driver_stats.driver_id;
  
  -- Calculate total rides
  total_rides := completed_rides + cancelled_rides;
  
  -- Get average rating
  SELECT COALESCE(AVG(rating), 0)
  INTO avg_rating
  FROM ratings 
  WHERE rated_id = get_driver_stats.driver_id AND rated_type = 'driver';
  
  -- Build result JSON
  result := json_build_object(
    'total_rides', total_rides,
    'completed_rides', completed_rides,
    'cancelled_rides', cancelled_rides,
    'total_earnings', total_earnings,
    'average_rating', avg_rating,
    'completion_rate', CASE 
      WHEN total_rides > 0 THEN ROUND((completed_rides::DECIMAL / total_rides) * 100, 2)
      ELSE 0 
    END
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get parent statistics
CREATE OR REPLACE FUNCTION get_parent_stats(parent_id UUID)
RETURNS JSON AS $$
DECLARE
  total_rides INTEGER;
  completed_rides INTEGER;
  cancelled_rides INTEGER;
  total_spent DECIMAL(10,2);
  result JSON;
BEGIN
  -- Get completed rides count and spending
  SELECT COUNT(*), COALESCE(SUM(fare), 0)
  INTO completed_rides, total_spent
  FROM completed_rides 
  WHERE parent_id = get_parent_stats.parent_id;
  
  -- Get cancelled rides count
  SELECT COUNT(*)
  INTO cancelled_rides
  FROM cancelled_rides 
  WHERE parent_id = get_parent_stats.parent_id;
  
  -- Calculate total rides
  total_rides := completed_rides + cancelled_rides;
  
  -- Build result JSON
  result := json_build_object(
    'total_rides', total_rides,
    'completed_rides', completed_rides,
    'cancelled_rides', cancelled_rides,
    'total_spent', total_spent,
    'completion_rate', CASE 
      WHEN total_rides > 0 THEN ROUND((completed_rides::DECIMAL / total_rides) * 100, 2)
      ELSE 0 
    END
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old notifications (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM notifications 
  WHERE created_at < NOW() - INTERVAL '30 days'
  AND is_read = TRUE;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to validate ride request data
CREATE OR REPLACE FUNCTION validate_ride_request(
  parent_id UUID,
  child_id UUID,
  scheduled_time TIMESTAMP WITH TIME ZONE,
  estimated_fare DECIMAL
) RETURNS BOOLEAN AS $$
BEGIN
  -- Check if parent exists and is a parent
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = parent_id AND user_type = 'parent') THEN
    RAISE EXCEPTION 'Invalid parent ID';
  END IF;
  
  -- Check if child exists and belongs to parent
  IF NOT EXISTS (SELECT 1 FROM children WHERE id = child_id AND parent_id = validate_ride_request.parent_id) THEN
    RAISE EXCEPTION 'Invalid child ID or child does not belong to parent';
  END IF;
  
  -- Check if scheduled time is in the future
  IF scheduled_time <= NOW() THEN
    RAISE EXCEPTION 'Scheduled time must be in the future';
  END IF;
  
  -- Check if fare is positive
  IF estimated_fare <= 0 THEN
    RAISE EXCEPTION 'Estimated fare must be positive';
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get ride summary for a specific period
CREATE OR REPLACE FUNCTION get_ride_summary(
  start_date DATE,
  end_date DATE
) RETURNS JSON AS $$
DECLARE
  total_requests INTEGER;
  accepted_requests INTEGER;
  completed_rides INTEGER;
  cancelled_rides INTEGER;
  total_revenue DECIMAL(10,2);
  result JSON;
BEGIN
  -- Get ride requests in period
  SELECT COUNT(*) INTO total_requests
  FROM ride_requests 
  WHERE DATE(created_at) BETWEEN start_date AND end_date;
  
  -- Get accepted requests
  SELECT COUNT(*) INTO accepted_requests
  FROM ride_requests 
  WHERE DATE(created_at) BETWEEN start_date AND end_date
  AND status = 'accepted';
  
  -- Get completed rides and revenue
  SELECT COUNT(*), COALESCE(SUM(fare), 0)
  INTO completed_rides, total_revenue
  FROM completed_rides 
  WHERE DATE(completed_at) BETWEEN start_date AND end_date;
  
  -- Get cancelled rides
  SELECT COUNT(*) INTO cancelled_rides
  FROM cancelled_rides 
  WHERE DATE(cancelled_at) BETWEEN start_date AND end_date;
  
  -- Build result
  result := json_build_object(
    'period', json_build_object('start', start_date, 'end', end_date),
    'total_requests', total_requests,
    'accepted_requests', accepted_requests,
    'completed_rides', completed_rides,
    'cancelled_rides', cancelled_rides,
    'total_revenue', total_revenue,
    'acceptance_rate', CASE 
      WHEN total_requests > 0 THEN ROUND((accepted_requests::DECIMAL / total_requests) * 100, 2)
      ELSE 0 
    END,
    'completion_rate', CASE 
      WHEN (completed_rides + cancelled_rides) > 0 THEN ROUND((completed_rides::DECIMAL / (completed_rides + cancelled_rides)) * 100, 2)
      ELSE 0 
    END
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to delete user account and all related data
CREATE OR REPLACE FUNCTION delete_user_account(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_type_val VARCHAR(10);
BEGIN
  -- Get user type
  SELECT user_type INTO user_type_val FROM users WHERE id = user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Check for active rides
  IF EXISTS (SELECT 1 FROM rides WHERE (parent_id = user_id OR driver_id = user_id) AND status IN ('scheduled', 'in_progress')) THEN
    RAISE EXCEPTION 'Cannot delete account with active rides';
  END IF;
  
  -- Delete user (cascading deletes will handle related records)
  DELETE FROM users WHERE id = user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
