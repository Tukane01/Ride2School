-- Create a function to update the last_online field
CREATE OR REPLACE FUNCTION update_driver_last_online(driver_id UUID, current_time TIMESTAMPTZ)
RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET last_online = current_time
  WHERE id = driver_id AND user_type = 'driver';
END;
$$ LANGUAGE plpgsql;
