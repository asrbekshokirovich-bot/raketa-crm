-- Add password_hint column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_hint TEXT;

-- Update the sync trigger function to include password_hint
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET 
    full_name = COALESCE(new.raw_user_meta_data->>'full_name', full_name),
    role = COALESCE(new.raw_user_meta_data->>'role', role),
    email = new.email,
    password_hint = COALESCE(new.raw_user_meta_data->>'password', password_hint)
  WHERE id = new.id;
  RETURN new;
END;
$$;

-- Update handle_new_user as well
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, password_hint)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'Admin'),
    new.raw_user_meta_data->>'password'
  );
  RETURN new;
END;
$$;
