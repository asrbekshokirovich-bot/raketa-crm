-- Enable Row Level Security
CREATE TABLE IF NOT EXISTS banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  link TEXT,
  is_active BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Turn on RLS
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read banners
CREATE POLICY "Enable read access for all authenticated users" ON banners FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON banners FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON banners FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete for authenticated users" ON banners FOR DELETE TO authenticated USING (true);


-- Create the storage bucket if it doesn't already exist.
-- Note: 'storage.buckets' table is a Supabase internal table. We will safely insert the bucket.
INSERT INTO storage.buckets (id, name, public)
VALUES ('banners', 'banners', true)
ON CONFLICT (id) DO NOTHING;

-- Grant access to the banners bucket
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'banners');
CREATE POLICY "Auth Insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'banners');
CREATE POLICY "Auth Update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'banners');
CREATE POLICY "Auth Delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'banners');
