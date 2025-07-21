-- Database triggers for automated operations

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all relevant tables
CREATE TRIGGER trigger_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_children_updated_at BEFORE UPDATE ON children FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_driver_profiles_updated_at BEFORE UPDATE ON driver_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_ride_requests_updated_at BEFORE UPDATE ON ride_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_rides_updated_at BEFORE UPDATE ON rides FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_completed_rides_updated_at BEFORE UPDATE ON completed_rides FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_cancelled_rides_updated_at BEFORE UPDATE ON cancelled_rides FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_help_articles_updated_at BEFORE UPDATE ON help_articles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_payment_cards_updated_at BEFORE UPDATE ON payment_cards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for ride request count
CREATE TRIGGER trigger_increment_ride_request_count
    AFTER INSERT ON ride_requests
    FOR EACH ROW
    EXECUTE FUNCTION increment_ride_request_count();

-- Trigger to update driver last online when location is updated
CREATE OR REPLACE FUNCTION update_driver_last_online()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.current_location_lat IS DISTINCT FROM OLD.current_location_lat OR 
       NEW.current_location_lng IS DISTINCT FROM OLD.current_location_lng THEN
        UPDATE users SET last_online = NOW() WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_driver_last_online
    AFTER UPDATE ON driver_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_driver_last_online();

-- Trigger to create notification when ride status changes
CREATE OR REPLACE FUNCTION create_ride_status_notification()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        INSERT INTO notifications (user_id, ride_id, title, message, type) VALUES
        (NEW.parent_id, NEW.id, 'Ride Status Update', 'Your ride status has changed to: ' || NEW.status, 'status_update'),
        (NEW.driver_id, NEW.id, 'Ride Status Update', 'Ride status has changed to: ' || NEW.status, 'status_update');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ride_status_notification
    AFTER UPDATE ON rides
    FOR EACH ROW
    EXECUTE FUNCTION create_ride_status_notification();
