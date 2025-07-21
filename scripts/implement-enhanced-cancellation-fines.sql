-- Enhanced cancellation fines policy - 10% of ride fare for both drivers and parents

-- First, drop existing functions to avoid return type conflicts
DROP FUNCTION IF EXISTS move_ride_to_cancelled(UUID, UUID, TEXT, DECIMAL);
DROP FUNCTION IF EXISTS move_ride_to_cancelled(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS move_ride_to_cancelled(UUID, UUID);
DROP FUNCTION IF EXISTS move_ride_back_to_requests(UUID, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS move_ride_back_to_requests(UUID, TEXT);
DROP FUNCTION IF EXISTS move_ride_back_to_requests(UUID);

-- Now create the enhanced move_ride_to_cancelled function
CREATE OR REPLACE FUNCTION move_ride_to_cancelled(
  p_ride_id UUID,
  p_cancelled_by_user_id UUID,
  p_cancellation_reason TEXT DEFAULT 'No reason provided',
  p_fine_amount DECIMAL(10, 2) DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  ride_record RECORD;
  canceller_type TEXT;
  calculated_fine DECIMAL(10, 2) := 0.00;
  result JSON;
BEGIN
  -- Get the ride data
  SELECT * INTO ride_record FROM rides WHERE id = p_ride_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ride not found';
  END IF;
  
  -- Determine who is cancelling and if they should be fined
  IF p_cancelled_by_user_id = ride_record.driver_id THEN
    canceller_type := 'driver';
    -- Driver cancellation fine: 10% of ride fare
    calculated_fine := COALESCE(ride_record.fare * 0.10, 0.00);
  ELSIF p_cancelled_by_user_id = ride_record.parent_id THEN
    canceller_type := 'parent';
    -- Parent cancellation fine: 10% of ride fare  
    calculated_fine := COALESCE(ride_record.fare * 0.10, 0.00);
  ELSE
    RAISE EXCEPTION 'User not authorized to cancel this ride';
  END IF;
  
  -- Use provided fine amount if specified, otherwise use calculated fine
  IF p_fine_amount IS NOT NULL THEN
    calculated_fine := p_fine_amount;
  END IF;
  
  -- Apply the fine to the canceller's wallet
  IF calculated_fine > 0 THEN
    UPDATE users 
    SET wallet_balance = GREATEST(0, wallet_balance - calculated_fine)
    WHERE id = p_cancelled_by_user_id;
    
    -- Add transaction record for the fine
    INSERT INTO transactions (
      user_id,
      amount,
      type,
      description,
      ride_id,
      created_at
    ) VALUES (
      p_cancelled_by_user_id,
      calculated_fine,
      'debit',
      'Cancellation fine (10% of ride fare)',
      p_ride_id,
      NOW()
    );
  END IF;
  
  -- Insert into cancelled_rides table
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
    p_cancelled_by_user_id,
    p_cancellation_reason,
    calculated_fine,
    CASE WHEN calculated_fine > 0 THEN TRUE ELSE FALSE END,
    ride_record.created_at,
    NOW()
  );
  
  -- Update parent's cancellation count
  IF canceller_type = 'parent' THEN
    UPDATE users 
    SET total_cancellations = COALESCE(total_cancellations, 0) + 1,
        cancellation_rate = CASE 
          WHEN COALESCE(total_ride_requests, 0) > 0 THEN 
            (COALESCE(total_cancellations, 0) + 1) * 100.0 / COALESCE(total_ride_requests, 1)
          ELSE 0 
        END
    WHERE id = ride_record.parent_id;
  END IF;
  
  -- Delete from rides table
  DELETE FROM rides WHERE id = p_ride_id;
  
  -- Return result with fine information
  result := json_build_object(
    'success', true,
    'canceller_type', canceller_type,
    'fine_applied', calculated_fine > 0,
    'fine_amount', calculated_fine,
    'message', CASE 
      WHEN calculated_fine > 0 THEN 
        'Ride cancelled. A fine of R' || calculated_fine || ' has been applied.'
      ELSE 
        'Ride cancelled successfully.'
    END
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Update move_ride_back_to_requests function for driver cancellations
CREATE OR REPLACE FUNCTION move_ride_back_to_requests(
  p_ride_id UUID,
  p_cancellation_reason TEXT DEFAULT 'Cancelled by driver',
  p_apply_fine BOOLEAN DEFAULT TRUE
)
RETURNS JSON AS $$
DECLARE
  ride_record RECORD;
  calculated_fine DECIMAL(10, 2) := 0.00;
  result JSON;
BEGIN
  -- Get the ride data
  SELECT * INTO ride_record FROM rides WHERE id = p_ride_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ride not found';
  END IF;
  
  -- Calculate fine for driver cancellation (10% of ride fare)
  IF p_apply_fine AND ride_record.fare IS NOT NULL THEN
    calculated_fine := ride_record.fare * 0.10;
    
    -- Apply the fine to the driver's wallet
    UPDATE users 
    SET wallet_balance = GREATEST(0, wallet_balance - calculated_fine)
    WHERE id = ride_record.driver_id;
    
    -- Add transaction record for the fine
    INSERT INTO transactions (
      user_id,
      amount,
      type,
      description,
      ride_id,
      created_at
    ) VALUES (
      ride_record.driver_id,
      calculated_fine,
      'debit',
      'Driver cancellation fine (10% of ride fare)',
      p_ride_id,
      NOW()
    );
  END IF;
  
  -- Insert the request back into ride_requests table
  INSERT INTO ride_requests (
    id,
    parent_id,
    child_id,
    origin_address,
    origin_lat,
    origin_lng,
    destination_address,
    destination_lat,
    destination_lng,
    destination_name,
    scheduled_time,
    estimated_fare,
    status,
    notes,
    created_at,
    updated_at
  ) VALUES (
    ride_record.request_id,
    ride_record.parent_id,
    ride_record.child_id,
    ride_record.origin_address,
    ride_record.origin_lat,
    ride_record.origin_lng,
    ride_record.destination_address,
    ride_record.destination_lat,
    ride_record.destination_lng,
    ride_record.destination_name,
    ride_record.scheduled_time,
    ride_record.fare,
    'pending',
    p_cancellation_reason || ' - Available for re-assignment',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    status = 'pending',
    notes = EXCLUDED.notes,
    updated_at = NOW();
  
  -- Delete from rides table
  DELETE FROM rides WHERE id = p_ride_id;
  
  -- Return result with fine information
  result := json_build_object(
    'success', true,
    'moved_to_requests', true,
    'fine_applied', calculated_fine > 0,
    'fine_amount', calculated_fine,
    'message', CASE 
      WHEN calculated_fine > 0 THEN 
        'Ride cancelled and moved back to requests. A fine of R' || calculated_fine || ' has been applied to the driver.'
      ELSE 
        'Ride cancelled and moved back to requests.'
    END
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Add columns to users table for tracking ride statistics
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS total_ride_requests INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_cancellations INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cancellation_rate DECIMAL(5, 2) DEFAULT 0.00;

-- Create function to update ride request count when a new request is created
CREATE OR REPLACE FUNCTION increment_ride_request_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users 
  SET total_ride_requests = COALESCE(total_ride_requests, 0) + 1,
      cancellation_rate = CASE 
        WHEN COALESCE(total_ride_requests, 0) + 1 > 0 THEN 
          COALESCE(total_cancellations, 0) * 100.0 / (COALESCE(total_ride_requests, 0) + 1)
        ELSE 0 
      END
  WHERE id = NEW.parent_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for ride request count
DROP TRIGGER IF EXISTS trigger_increment_ride_request_count ON ride_requests;
CREATE TRIGGER trigger_increment_ride_request_count
  AFTER INSERT ON ride_requests
  FOR EACH ROW
  EXECUTE FUNCTION increment_ride_request_count();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION move_ride_to_cancelled TO authenticated;
GRANT EXECUTE ON FUNCTION move_ride_to_cancelled TO service_role;
GRANT EXECUTE ON FUNCTION move_ride_back_to_requests TO authenticated;
GRANT EXECUTE ON FUNCTION move_ride_back_to_requests TO service_role;
