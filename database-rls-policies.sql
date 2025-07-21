-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_articles ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (id = auth.uid());

-- Children table policies
CREATE POLICY "Parents can view their own children" ON children
  FOR SELECT USING (parent_id = auth.uid());

CREATE POLICY "Parents can insert their own children" ON children
  FOR INSERT WITH CHECK (parent_id = auth.uid());

CREATE POLICY "Parents can update their own children" ON children
  FOR UPDATE USING (parent_id = auth.uid());

CREATE POLICY "Parents can delete their own children" ON children
  FOR DELETE USING (parent_id = auth.uid());

-- Cars table policies
CREATE POLICY "Drivers can view their own cars" ON cars
  FOR SELECT USING (driver_id = auth.uid());

CREATE POLICY "Drivers can insert their own cars" ON cars
  FOR INSERT WITH CHECK (driver_id = auth.uid());

CREATE POLICY "Drivers can update their own cars" ON cars
  FOR UPDATE USING (driver_id = auth.uid());

CREATE POLICY "Drivers can delete their own cars" ON cars
  FOR DELETE USING (driver_id = auth.uid());

-- Ride requests table policies
CREATE POLICY "Parents can view their own ride requests" ON ride_requests
  FOR SELECT USING (parent_id = auth.uid());

CREATE POLICY "Drivers can view pending ride requests" ON ride_requests
  FOR SELECT USING (status = 'pending');

CREATE POLICY "Parents can insert their own ride requests" ON ride_requests
  FOR INSERT WITH CHECK (parent_id = auth.uid());

CREATE POLICY "Parents can update their own ride requests" ON ride_requests
  FOR UPDATE USING (parent_id = auth.uid());

-- Rides table policies
CREATE POLICY "Users can view their own rides" ON rides
  FOR SELECT USING (parent_id = auth.uid() OR driver_id = auth.uid());

CREATE POLICY "Drivers can insert rides they accept" ON rides
  FOR INSERT WITH CHECK (driver_id = auth.uid());

CREATE POLICY "Users can update their own rides" ON rides
  FOR UPDATE USING (parent_id = auth.uid() OR driver_id = auth.uid());

-- Messages table policies
CREATE POLICY "Users can view their own messages" ON messages
  FOR SELECT USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update their own sent messages" ON messages
  FOR UPDATE USING (sender_id = auth.uid() OR recipient_id = auth.uid());

-- Transactions table policies
CREATE POLICY "Users can view their own transactions" ON transactions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert transactions" ON transactions
  FOR INSERT WITH CHECK (true);

-- Ratings table policies
CREATE POLICY "Users can view ratings for their rides" ON ratings
  FOR SELECT USING (
    rater_id = auth.uid() OR 
    rated_id = auth.uid() OR
    EXISTS (SELECT 1 FROM rides WHERE id = ride_id AND (parent_id = auth.uid() OR driver_id = auth.uid()))
  );

CREATE POLICY "Users can insert ratings for their rides" ON ratings
  FOR INSERT WITH CHECK (rater_id = auth.uid());

-- Notifications table policies
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Help articles table policies (public read access)
CREATE POLICY "Anyone can view help articles" ON help_articles
  FOR SELECT USING (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
