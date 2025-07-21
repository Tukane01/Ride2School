-- Create comprehensive indexes for better performance

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_id_number ON users(id_number);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_is_online ON users(is_online) WHERE is_online = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_last_online ON users(last_online);

-- Children table indexes
CREATE INDEX IF NOT EXISTS idx_children_parent_id ON children(parent_id);
CREATE INDEX IF NOT EXISTS idx_children_id_number ON children(id_number);
CREATE INDEX IF NOT EXISTS idx_children_school_name ON children(school_name);

-- Cars table indexes
CREATE INDEX IF NOT EXISTS idx_cars_driver_id ON cars(driver_id);
CREATE INDEX IF NOT EXISTS idx_cars_registration ON cars(registration);
CREATE INDEX IF NOT EXISTS idx_cars_vin_number ON cars(vin_number);

-- Ride requests table indexes
CREATE INDEX IF NOT EXISTS idx_ride_requests_parent_id ON ride_requests(parent_id);
CREATE INDEX IF NOT EXISTS idx_ride_requests_child_id ON ride_requests(child_id);
CREATE INDEX IF NOT EXISTS idx_ride_requests_status ON ride_requests(status);
CREATE INDEX IF NOT EXISTS idx_ride_requests_scheduled_time ON ride_requests(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_ride_requests_created_at ON ride_requests(created_at);

-- Rides table indexes
CREATE INDEX IF NOT EXISTS idx_rides_parent_id ON rides(parent_id);
CREATE INDEX IF NOT EXISTS idx_rides_child_id ON rides(child_id);
CREATE INDEX IF NOT EXISTS idx_rides_driver_id ON rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_rides_request_id ON rides(request_id);
CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status);
CREATE INDEX IF NOT EXISTS idx_rides_scheduled_time ON rides(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_rides_completed_at ON rides(completed_at);
CREATE INDEX IF NOT EXISTS idx_rides_cancelled_at ON rides(cancelled_at);
CREATE INDEX IF NOT EXISTS idx_rides_cancelled_by ON rides(cancelled_by);
CREATE INDEX IF NOT EXISTS idx_rides_created_at ON rides(created_at);

-- Messages table indexes
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_ride_id ON messages(ride_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read) WHERE is_read = FALSE;

-- Transactions table indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_ride_id ON transactions(ride_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- Ratings table indexes
CREATE INDEX IF NOT EXISTS idx_ratings_ride_id ON ratings(ride_id);
CREATE INDEX IF NOT EXISTS idx_ratings_rater_id ON ratings(rater_id);
CREATE INDEX IF NOT EXISTS idx_ratings_rated_id ON ratings(rated_id);
CREATE INDEX IF NOT EXISTS idx_ratings_rated_type ON ratings(rated_type);
CREATE INDEX IF NOT EXISTS idx_ratings_rating ON ratings(rating);
CREATE INDEX IF NOT EXISTS idx_ratings_created_at ON ratings(created_at);

-- Notifications table indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_ride_id ON notifications(ride_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Help articles table indexes
CREATE INDEX IF NOT EXISTS idx_help_articles_category ON help_articles(category);
CREATE INDEX IF NOT EXISTS idx_help_articles_title ON help_articles(title);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_rides_driver_status ON rides(driver_id, status);
CREATE INDEX IF NOT EXISTS idx_rides_parent_status ON rides(parent_id, status);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, recipient_id, created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON transactions(user_id, type, created_at);

-- Add missing foreign key constraints that might be missing
ALTER TABLE children 
ADD CONSTRAINT IF NOT EXISTS fk_children_parent 
FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE cars 
ADD CONSTRAINT IF NOT EXISTS fk_cars_driver 
FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE ride_requests 
ADD CONSTRAINT IF NOT EXISTS fk_ride_requests_parent 
FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE ride_requests 
ADD CONSTRAINT IF NOT EXISTS fk_ride_requests_child 
FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE;

ALTER TABLE rides 
ADD CONSTRAINT IF NOT EXISTS fk_rides_request 
FOREIGN KEY (request_id) REFERENCES ride_requests(id) ON DELETE SET NULL;

ALTER TABLE rides 
ADD CONSTRAINT IF NOT EXISTS fk_rides_parent 
FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE rides 
ADD CONSTRAINT IF NOT EXISTS fk_rides_child 
FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE;

ALTER TABLE rides 
ADD CONSTRAINT IF NOT EXISTS fk_rides_driver 
FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE rides 
ADD CONSTRAINT IF NOT EXISTS fk_rides_cancelled_by 
FOREIGN KEY (cancelled_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE messages 
ADD CONSTRAINT IF NOT EXISTS fk_messages_sender 
FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE messages 
ADD CONSTRAINT IF NOT EXISTS fk_messages_recipient 
FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE messages 
ADD CONSTRAINT IF NOT EXISTS fk_messages_ride 
FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE;

ALTER TABLE transactions 
ADD CONSTRAINT IF NOT EXISTS fk_transactions_user 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE transactions 
ADD CONSTRAINT IF NOT EXISTS fk_transactions_ride 
FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE SET NULL;

ALTER TABLE ratings 
ADD CONSTRAINT IF NOT EXISTS fk_ratings_ride 
FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE;

ALTER TABLE ratings 
ADD CONSTRAINT IF NOT EXISTS fk_ratings_rater 
FOREIGN KEY (rater_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE ratings 
ADD CONSTRAINT IF NOT EXISTS fk_ratings_rated 
FOREIGN KEY (rated_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE notifications 
ADD CONSTRAINT IF NOT EXISTS fk_notifications_user 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE notifications 
ADD CONSTRAINT IF NOT EXISTS fk_notifications_ride 
FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE;
