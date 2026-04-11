-- Create Announcements table
CREATE TABLE public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT,
    media_url TEXT,
    media_type VARCHAR(20), -- 'image', 'video', etc
    status VARCHAR(20) DEFAULT 'sent',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to perform all operations
CREATE POLICY "Enable all for authenticated users" 
ON public.announcements FOR ALL 
TO authenticated 
USING (true);

-- Allow public to select announcements (for the mobile app)
CREATE POLICY "Enable read for public" 
ON public.announcements FOR SELECT 
USING (true);

-- Create storage bucket for announcement media
INSERT INTO storage.buckets (id, name, public) 
VALUES ('announcements', 'announcements', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage security policies for the 'announcements' bucket
create policy "Announcements Public Access"
  on storage.objects for select
  using ( bucket_id = 'announcements' );

create policy "Announcements Authenticated Insert"
  on storage.objects for insert
  with check ( bucket_id = 'announcements' and auth.role() = 'authenticated' );

create policy "Announcements Authenticated Update"
  on storage.objects for update
  using ( bucket_id = 'announcements' and auth.role() = 'authenticated' );

create policy "Announcements Authenticated Delete"
  on storage.objects for delete
  using ( bucket_id = 'announcements' and auth.role() = 'authenticated' );
