-- Database maintenance and cleanup procedures

-- Function to clean up old notifications (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notifications 
    WHERE created_at < NOW() - INTERVAL '30 days' 
    AND is_read = true;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old messages (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_messages()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM messages 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old download history (older than 1 year)
CREATE OR REPLACE FUNCTION cleanup_old_download_history()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM download_history 
    WHERE download_date < NOW() - INTERVAL '1 year';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update user statistics
CREATE OR REPLACE FUNCTION update_user_statistics()
RETURNS VOID AS $$
BEGIN
    -- Update parent ride request counts
    UPDATE users SET 
        total_ride_requests = (
            SELECT COUNT(*) FROM ride_requests WHERE parent_id = users.id
        ),
        total_cancellations = (
            SELECT COUNT(*) FROM cancelled_rides WHERE parent_id = users.id AND cancelled_by = users.id
        )
    WHERE user_type = 'parent';
    
    -- Update cancellation rates
    UPDATE users SET 
        cancellation_rate = CASE 
            WHEN total_ride_requests > 0 THEN 
                (total_cancellations * 100.0 / total_ride_requests)
            ELSE 0 
        END
    WHERE user_type = 'parent';
    
    -- Update driver statistics
    UPDATE driver_profiles SET 
        total_rides_completed = (
            SELECT COUNT(*) FROM completed_rides WHERE driver_id = driver_profiles.user_id
        );
END;
$$ LANGUAGE plpgsql;

-- Function to archive completed rides older than 1 year
CREATE OR REPLACE FUNCTION archive_old_completed_rides()
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- In a real system, you might move these to an archive table
    -- For now, we'll just count them
    SELECT COUNT(*) INTO archived_count
    FROM completed_rides 
    WHERE completed_at < NOW() - INTERVAL '1 year';
    
    -- You could create an archive table and move the data there
    -- CREATE TABLE IF NOT EXISTS archived_completed_rides AS SELECT * FROM completed_rides WHERE false;
    -- INSERT INTO archived_completed_rides SELECT * FROM completed_rides WHERE completed_at < NOW() - INTERVAL '1 year';
    -- DELETE FROM completed_rides WHERE completed_at < NOW() - INTERVAL '1 year';
    
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions for maintenance functions
GRANT EXECUTE ON FUNCTION cleanup_old_notifications TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_messages TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_download_history TO service_role;
GRANT EXECUTE ON FUNCTION update_user_statistics TO service_role;
GRANT EXECUTE ON FUNCTION archive_old_completed_rides TO service_role;
