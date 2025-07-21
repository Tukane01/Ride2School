-- Create a table to track user downloads
CREATE TABLE IF NOT EXISTS downloads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  download_type VARCHAR(50) NOT NULL, -- 'transactions', 'rides'
  format VARCHAR(10) NOT NULL, -- 'pdf', 'docx', 'csv'
  time_range VARCHAR(20) NOT NULL, -- 'today', 'week', 'month', 'quarter', 'year', 'custom'
  custom_start_date TIMESTAMP WITH TIME ZONE,
  custom_end_date TIMESTAMP WITH TIME ZONE,
  record_count INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_user
    FOREIGN KEY(user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);

-- Create an index for faster queries
CREATE INDEX IF NOT EXISTS idx_downloads_user_id ON downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_downloads_created_at ON downloads(created_at);

-- Add a function to track downloads
CREATE OR REPLACE FUNCTION track_download()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO downloads (
    user_id, 
    download_type, 
    format, 
    time_range, 
    custom_start_date, 
    custom_end_date, 
    record_count
  ) VALUES (
    NEW.user_id,
    NEW.download_type,
    NEW.format,
    NEW.time_range,
    NEW.custom_start_date,
    NEW.custom_end_date,
    NEW.record_count
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to track downloads
CREATE TRIGGER track_download_trigger
AFTER INSERT ON downloads
FOR EACH ROW
EXECUTE FUNCTION track_download();
