-- Trigger function to handle updates to auth.users and sync to public.profiles
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
    email = new.email
  WHERE id = new.id;
  RETURN new;
END;
$$;

-- Create the trigger on auth.users for updates
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_user_update();
