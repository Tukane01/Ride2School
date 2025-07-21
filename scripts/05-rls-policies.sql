-- Row Level Security policies

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE completed_rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE cancelled_rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE download_history ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Service role can manage all users" ON users FOR ALL USING (auth.role() = 'service_role');

-- Children policies
CREATE POLICY "Parents can manage their children" ON children FOR ALL USING (auth.uid() = parent_id);
CREATE POLICY "Service role can manage all children" ON children FOR ALL USING (auth.role() = 'service_role');

-- Driver profiles policies
CREATE POLICY "Drivers can manage their profile" ON driver_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage all driver profiles" ON driver_profiles FOR ALL USING (auth.role() = 'service_role');

-- Ride requests policies
CREATE POLICY "Parents can manage their ride requests" ON ride_requests FOR ALL USING (auth.uid() = parent_id);
CREATE POLICY "Drivers can view pending requests" ON ride_requests FOR SELECT USING (status = 'pending');
CREATE POLICY "Service role can manage all ride requests" ON ride_requests FOR ALL USING (auth.role() = 'service_role');

-- Rides policies
CREATE POLICY "Parents can view their rides" ON rides FOR SELECT USING (auth.uid() = parent_id);
CREATE POLICY "Drivers can view their rides" ON rides FOR SELECT USING (auth.uid() = driver_id);
CREATE POLICY "Parents can update their rides" ON rides FOR UPDATE USING (auth.uid() = parent_id);
CREATE POLICY "Drivers can update their rides" ON rides FOR UPDATE USING (auth.uid() = driver_id);
CREATE POLICY "Service role can manage all rides" ON rides FOR ALL USING (auth.role() = 'service_role');

-- Completed rides policies
CREATE POLICY "Parents can view their completed rides" ON completed_rides FOR SELECT USING (auth.uid() = parent_id);
CREATE POLICY "Drivers can view their completed rides" ON completed_rides FOR SELECT USING (auth.uid() = driver_id);
CREATE POLICY "Service role can manage all completed rides" ON completed_rides FOR ALL USING (auth.role() = 'service_role');

-- Cancelled rides policies
CREATE POLICY "Parents can view their cancelled rides" ON cancelled_rides FOR SELECT USING (auth.uid() = parent_id);
CREATE POLICY "Drivers can view their cancelled rides" ON cancelled_rides FOR SELECT USING (auth.uid() = driver_id);
CREATE POLICY "Service role can manage all cancelled rides" ON cancelled_rides FOR ALL USING (auth.role() = 'service_role');

-- Transactions policies
CREATE POLICY "Users can view their transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage all transactions" ON transactions FOR ALL USING (auth.role() = 'service_role');

-- Notifications policies
CREATE POLICY "Users can view their notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage all notifications" ON notifications FOR ALL USING (auth.role() = 'service_role');

-- Messages policies
CREATE POLICY "Users can view messages they sent or received" ON messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update messages they sent" ON messages FOR UPDATE USING (auth.uid() = sender_id);
CREATE POLICY "Service role can manage all messages" ON messages FOR ALL USING (auth.role() = 'service_role');

-- Payment cards policies
CREATE POLICY "Users can manage their payment cards" ON payment_cards FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage all payment cards" ON payment_cards FOR ALL USING (auth.role() = 'service_role');

-- Download history policies
CREATE POLICY "Users can view their download history" ON download_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add to their download history" ON download_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role can manage all download history" ON download_history FOR ALL USING (auth.role() = 'service_role');

-- Help articles policies (public read access)
CREATE POLICY "Anyone can read published help articles" ON help_articles FOR SELECT USING (is_published = true);
CREATE POLICY "Service role can manage all help articles" ON help_articles FOR ALL USING (auth.role() = 'service_role');

-- Geocoded addresses policies (public read access for caching)
CREATE POLICY "Anyone can read geocoded addresses" ON geocoded_addresses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role can manage geocoded addresses" ON geocoded_addresses FOR ALL USING (auth.role() = 'service_role');
