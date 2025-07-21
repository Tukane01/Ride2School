-- Sample data for testing the school ride app

-- Insert sample help articles
INSERT INTO help_articles (title, content, category, target_audience) VALUES
('How to Request a Ride', 'Step-by-step guide on how to request a ride for your child...', 'Getting Started', 'parent'),
('Driver Safety Guidelines', 'Important safety guidelines for drivers...', 'Safety', 'driver'),
('Payment and Billing', 'Information about payment methods and billing...', 'Payments', 'both'),
('Cancellation Policy', 'Understanding our cancellation policy and fees...', 'Policies', 'both'),
('Emergency Procedures', 'What to do in case of an emergency...', 'Safety', 'both'),
('App Navigation', 'How to navigate and use the app effectively...', 'Getting Started', 'both'),
('Driver Requirements', 'Requirements to become a driver...', 'Getting Started', 'driver'),
('Child Safety Features', 'Safety features designed to protect your child...', 'Safety', 'parent');

-- Insert sample geocoded addresses (common school locations)
INSERT INTO geocoded_addresses (address, latitude, longitude, formatted_address) VALUES
('Johannesburg Primary School, Johannesburg', -26.2041, 28.0473, 'Johannesburg Primary School, Johannesburg, South Africa'),
('Cape Town High School, Cape Town', -33.9249, 18.4241, 'Cape Town High School, Cape Town, South Africa'),
('Durban Elementary, Durban', -29.8587, 31.0218, 'Durban Elementary, Durban, South Africa'),
('Pretoria Academy, Pretoria', -25.7479, 28.2293, 'Pretoria Academy, Pretoria, South Africa'),
('Port Elizabeth School, Port Elizabeth', -33.9608, 25.6022, 'Port Elizabeth School, Port Elizabeth, South Africa');

-- Note: In a real deployment, you would not insert sample users with hardcoded data
-- This is just for testing purposes
