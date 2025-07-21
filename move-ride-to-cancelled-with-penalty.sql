-- Function to move a ride to cancelled_rides table with penalty information
CREATE OR REPLACE FUNCTION move_ride_to_cancelled(
  ride_id UUID,
  cancelled_by_user_id UUID,
  cancellation_reason TEXT DEFAULT 'No reason provided',
  fine_amount DECIMAL(10,2) DEFAULT 0
) RETURNS BOOLEAN AS $$
DECLARE
  ride_record RECORD;
BEGIN
  -- Get the ride data
  SELECT * INTO ride_record FROM rides WHERE id = ride_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ride not found';
  END IF;
  
  -- Insert into cancelled_rides table
  INSERT INTO cancelled_rides (
    original_ride_id,
    parent_id,
    driver_id,
    child_id,
    origin_lat,
    origin_lng,
    origin_address,
    destination_lat,
    destination_lng,
    destination_address,
    destination_name,
    scheduled_time,
    estimated_arrival,
    fare,
    otp,
    otp_generated_at,
    current_location_lat,
    current_location_lng,
    current_location_address,
    cancelled_at,
    cancelled_by,
    cancellation_reason,
    penalty_fee,
    request_id,
    created_at,
    updated_at
  ) VALUES (
    ride_record.id,
    ride_record.parent_id,
    ride_record.driver_id,
    ride_record.child_id,
    ride_record.origin_lat,
    ride_record.origin_lng,
    ride_record.origin_address,
    ride_record.destination_lat,
    ride_record.destination_lng,
    ride_record.destination_address,
    ride_record.destination_name,
    ride_record.scheduled_time,
    ride_record.estimated_arrival,
    ride_record.fare,
    ride_record.otp,
    ride_record.otp_generated_at,
    ride_record.current_location_lat,
    ride_record.current_location_lng,
    ride_record.current_location_address,
    NOW(),
    cancelled_by_user_id,
    cancellation_reason,
    fine_amount,
    ride_record.request_id,
    ride_record.created_at,
    NOW()
  );
  
  -- Delete from rides table
  DELETE FROM rides WHERE id = ride_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to move ride to cancelled: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;
