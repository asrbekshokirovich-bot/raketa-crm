-- Supabase Auth & Roles Setup for RAKETA CRM

-- 1. Create a Profiles table that links to Supabase's built-in auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    full_name TEXT,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'Admin' CHECK (role IN ('Owner', 'Admin'))
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read/write access to profiles" ON public.profiles FOR ALL USING (true);


-- 2. Create a trigger that automatically inserts a row into public.profiles whenever a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'Admin')
  );
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- WARNING: 
-- In a real production app, to create an "Owner" for the first time, 
-- you would sign up via the app and then manually run:
-- UPDATE public.profiles SET role = 'Owner' WHERE email = 'YOUR_OWNER_EMAIL@raketa.uz';
