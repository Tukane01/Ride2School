-- First, let's create a function to create a notification for the parent
CREATE OR REPLACE FUNCTION create_parent_notification_on_ride_request()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notification for the parent
  INSERT INTO notifications (
    user_id,
    title,
    content,
    type,
    is_read,
    created_at
  ) VALUES (
    NEW.parent_id,
    'Ride Requested',
    'Your ride request has been submitted.',
    'ride_request',
    FALSE,
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to run the function when a new ride request is created
DROP TRIGGER IF EXISTS parent_notification_trigger ON ride_requests;
CREATE TRIGGER parent_notification_trigger
AFTER INSERT ON ride_requests
FOR EACH ROW
EXECUTE FUNCTION create_parent_notification_on_ride_request();

-- Now, let's create a function to notify drivers of new ride requests
CREATE OR REPLACE FUNCTION notify_drivers_of_new_ride_request()
RETURNS TRIGGER AS $$
DECLARE
  driver_id uuid;
BEGIN
  -- For each online driver, create a notification
  FOR driver_id IN (SELECT id FROM users WHERE user_type = 'driver' AND is_online = TRUE)
  LOOP
    INSERT INTO notifications (
      user_id,
      title,
      content,
      type,
      is_read,
      created_at
    ) VALUES (
      driver_id,
      'New Ride Request',
      'A new ride request is available. Check your dashboard to accept it.',
      'new_ride_request',
      FALSE,
      NOW()
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to run the function when a new ride request is created
DROP TRIGGER IF EXISTS notify_drivers_trigger ON ride_requests;
CREATE TRIGGER notify_drivers_trigger
AFTER INSERT ON ride_requests
FOR EACH ROW
EXECUTE FUNCTION notify_drivers_of_new_ride_request();
