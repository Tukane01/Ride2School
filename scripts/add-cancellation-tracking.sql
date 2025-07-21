-- Add cancellation tracking columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS total_ride_requests INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_cancellations INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cancellation_rate DECIMAL(5,2) DEFAULT 0.00;

-- Create function to update cancellation stats
CREATE OR REPLACE FUNCTION update_cancellation_stats(
  p_user_id UUID,
  p_is_cancellation BOOLEAN DEFAULT FALSE
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_is_cancellation THEN
    -- Increment cancellation count
    UPDATE users 
    SET total_cancellations = COALESCE(total_cancellations, 0) + 1,
        cancellation_rate = CASE 
          WHEN COALESCE(total_ride_requests, 0) > 0 THEN 
            ROUND((COALESCE(total_cancellations, 0) + 1) * 100.0 / COALESCE(total_ride_requests, 1), 2)
          ELSE 0 
        END
    WHERE id = p_user_id;
  ELSE
    -- Increment ride request count
    UPDATE users 
    SET total_ride_requests = COALESCE(total_ride_requests, 0) + 1,
        cancellation_rate = CASE 
          WHEN COALESCE(total_ride_requests, 0) + 1 > 0 THEN 
            ROUND(COALESCE(total_cancellations, 0) * 100.0 / (COALESCE(total_ride_requests, 0) + 1), 2)
          ELSE 0 
        END
    WHERE id = p_user_id;
  END IF;
END;
$$;

-- Create trigger to automatically update stats when rides are created or cancelled
CREATE OR REPLACE FUNCTION trigger_update_cancellation_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_TABLE_NAME = 'ride_requests' AND TG_OP = 'INSERT' THEN
    -- New ride request created
    PERFORM update_cancellation_stats(NEW.parent_id, FALSE);
  ELSIF TG_TABLE_NAME = 'cancelled_rides' AND TG_OP = 'INSERT' THEN
    -- Ride was cancelled
    PERFORM update_cancellation_stats(NEW.parent_id, TRUE);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_ride_request_stats ON ride_requests;
CREATE TRIGGER trigger_ride_request_stats
  AFTER INSERT ON ride_requests
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_cancellation_stats();

DROP TRIGGER IF EXISTS trigger_cancellation_stats ON cancelled_rides;
CREATE TRIGGER trigger_cancellation_stats
  AFTER INSERT ON cancelled_rides
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_cancellation_stats();

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_cancellation_stats(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_update_cancellation_stats() TO authenticated;
