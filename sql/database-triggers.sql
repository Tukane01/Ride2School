-- Create a function to notify drivers about new ride requests
CREATE OR REPLACE FUNCTION notify_drivers_of_new_ride_request()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert notifications for all online drivers who don't have active rides
  INSERT INTO notifications (
    user_id, 
    title, 
    content, 
    type, 
    is_read
  )
  SELECT 
    u.id, 
    'New Ride Request', 
    'A new ride request is available. Check your dashboard to accept it.', 
    'new_ride_request', 
    FALSE
  FROM 
    users u
  WHERE 
    u.user_type = 'driver' 
    AND u.is_online = TRUE
    AND NOT EXISTS (
      SELECT 1 FROM rides r 
      WHERE r.driver_id = u.id 
      AND r.status IN ('scheduled', 'in_progress')
    );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to call the function when a new ride request is inserted
DROP TRIGGER IF EXISTS notify_drivers_trigger ON ride_requests;
CREATE TRIGGER notify_drivers_trigger
AFTER INSERT ON ride_requests
FOR EACH ROW
EXECUTE FUNCTION notify_drivers_of_new_ride_request();
