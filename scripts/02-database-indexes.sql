-- Create indexes for better performance

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_last_online ON users(last_online);

-- Children table indexes
CREATE INDEX IF NOT EXISTS idx_children_parent_id ON children(parent_id);
CREATE INDEX IF NOT EXISTS idx_children_is_active ON children(is_active);

-- Driver profiles indexes
CREATE INDEX IF NOT EXISTS idx_driver_profiles_user_id ON driver_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_is_available ON driver_profiles(is_available);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_location ON driver_profiles(current_location_lat, current_location_lng);

-- Ride requests indexes
CREATE INDEX IF NOT EXISTS idx_ride_requests_parent_id ON ride_requests(parent_id);
CREATE INDEX IF NOT EXISTS idx_ride_requests_child_id ON ride_requests(child_id);
CREATE INDEX IF NOT EXISTS idx_ride_requests_status ON ride_requests(status);
CREATE INDEX IF NOT EXISTS idx_ride_requests_scheduled_time ON ride_requests(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_ride_requests_created_at ON ride_requests(created_at);

-- Rides table indexes
CREATE INDEX IF NOT EXISTS idx_rides_request_id ON rides(request_id);
CREATE INDEX IF NOT EXISTS idx_rides_parent_id ON rides(parent_id);
CREATE INDEX IF NOT EXISTS idx_rides_child_id ON rides(child_id);
CREATE INDEX IF NOT EXISTS idx_rides_driver_id ON rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status);
CREATE INDEX IF NOT EXISTS idx_rides_scheduled_time ON rides(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_rides_created_at ON rides(created_at);

-- Completed rides indexes
CREATE INDEX IF NOT EXISTS idx_completed_rides_original_ride_id ON completed_rides(original_ride_id);
CREATE INDEX IF NOT EXISTS idx_completed_rides_parent_id ON completed_rides(parent_id);
CREATE INDEX IF NOT EXISTS idx_completed_rides_driver_id ON completed_rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_completed_rides_completed_at ON completed_rides(completed_at);

-- Cancelled rides indexes
CREATE INDEX IF NOT EXISTS idx_cancelled_rides_original_ride_id ON cancelled_rides(original_ride_id);
CREATE INDEX IF NOT EXISTS idx_cancelled_rides_parent_id ON cancelled_rides(parent_id);
CREATE INDEX IF NOT EXISTS idx_cancelled_rides_driver_id ON cancelled_rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_cancelled_rides_cancelled_at ON cancelled_rides(cancelled_at);
CREATE INDEX IF NOT EXISTS idx_cancelled_rides_cancelled_by ON cancelled_rides(cancelled_by);

-- Transactions indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_ride_id ON transactions(ride_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_ride_id ON notifications(ride_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_ride_id ON messages(ride_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Help articles indexes
CREATE INDEX IF NOT EXISTS idx_help_articles_category ON help_articles(category);
CREATE INDEX IF NOT EXISTS idx_help_articles_target_audience ON help_articles(target_audience);
CREATE INDEX IF NOT EXISTS idx_help_articles_is_published ON help_articles(is_published);

-- Payment cards indexes
CREATE INDEX IF NOT EXISTS idx_payment_cards_user_id ON payment_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_cards_is_default ON payment_cards(is_default);
CREATE INDEX IF NOT EXISTS idx_payment_cards_is_active ON payment_cards(is_active);

-- Geocoded addresses indexes
CREATE INDEX IF NOT EXISTS idx_geocoded_addresses_address ON geocoded_addresses(address);
CREATE INDEX IF NOT EXISTS idx_geocoded_addresses_location ON geocoded_addresses(latitude, longitude);

-- Download history indexes
CREATE INDEX IF NOT EXISTS idx_download_history_user_id ON download_history(user_id);
CREATE INDEX IF NOT EXISTS idx_download_history_download_date ON download_history(download_date);
