-- Create a generic app_settings table for dynamic configurations like contacts, colors, etc.
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Allow read access for everyone (public app users need to read contact numbers)
CREATE POLICY "Allow public read access to app_settings"
  ON app_settings FOR SELECT
  USING (true);

-- Allow full access for authenticated users (admins inside CRM)
CREATE POLICY "Allow authenticated full access to app_settings"
  ON app_settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert essential starting keys if they don't already exist
INSERT INTO app_settings (key, value)
VALUES 
  ('contact_phone', ''),
  ('contact_telegram', '')
ON CONFLICT (key) DO NOTHING;
