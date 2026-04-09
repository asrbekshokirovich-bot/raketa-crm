-- Create app_users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.app_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- Create policy for all access (since it's a test/local setup mostly)
CREATE POLICY "Enable all for all" ON public.app_users FOR ALL USING (true) WITH CHECK (true);

-- Insert test user
INSERT INTO public.app_users (full_name, phone, role, created_at)
VALUES ('Abulfayz Test', '+998 90 123 45 67', 'Mijoz', NOW());
