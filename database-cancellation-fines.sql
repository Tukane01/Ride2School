-- Add cancellation fine tracking to cancelled_rides table
ALTER TABLE cancelled_rides 
ADD COLUMN IF NOT EXISTS cancellation_fine DECIMAL(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS fine_applied BOOLEAN DEFAULT FALSE;

-- Update the move_ride_to_cancelled function to include fine information
CREATE OR REPLACE FUNCTION move_ride_to_cancelled(
  ride_id UUID,
  cancelled_by_user_id UUID,
  cancellation_reason TEXT DEFAULT 'No reason provided',
  fine_amount DECIMAL(10, 2) DEFAULT 0.00
)
RETURNS VOID AS $$
DECLARE
  ride_record RECORD;
BEGIN
  -- Get the ride data
  SELECT * INTO ride_record FROM rides WHERE id = ride_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ride not found';
  END IF;
  
  -- Insert into cancelled_rides table with fine information
  INSERT INTO cancelled_rides (
    original_ride_id,
    request_id,
    parent_id,
    child_id,
    driver_id,
    origin_address,
    origin_lat,
    origin_lng,
    destination_address,
    destination_lat,
    destination_lng,
    destination_name,
    scheduled_time,
    fare,
    otp,
    otp_generated_at,
    current_location_lat,
    current_location_lng,
    current_location_address,
    estimated_arrival,
    cancelled_at,
    cancelled_by,
    cancellation_reason,
    cancellation_fine,
    fine_applied,
    created_at,
    updated_at
  ) VALUES (
    ride_record.id,
    ride_record.request_id,
    ride_record.parent_id,
    ride_record.child_id,
    ride_record.driver_id,
    ride_record.origin_address,
    ride_record.origin_lat,
    ride_record.origin_lng,
    ride_record.destination_address,
    ride_record.destination_lat,
    ride_record.destination_lng,
    ride_record.destination_name,
    ride_record.scheduled_time,
    ride_record.fare,
    ride_record.otp,
    ride_record.otp_generated_at,
    ride_record.current_location_lat,
    ride_record.current_location_lng,
    ride_record.current_location_address,
    ride_record.estimated_arrival,
    NOW(),
    cancelled_by_user_id,
    cancellation_reason,
    fine_amount,
    CASE WHEN fine_amount > 0 THEN TRUE ELSE FALSE END,
    ride_record.created_at,
    NOW()
  );
  
  -- Delete from rides table
  DELETE FROM rides WHERE id = ride_id;
END;
$$ LANGUAGE plpgsql;

-- Create index for better performance on cancellation fine queries
CREATE INDEX IF NOT EXISTS idx_cancelled_rides_fine_applied ON cancelled_rides(fine_applied);
CREATE INDEX IF NOT EXISTS idx_cancelled_rides_cancellation_fine ON cancelled_rides(cancellation_fine);
