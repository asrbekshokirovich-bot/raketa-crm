DO $$ 
DECLARE
  constraint_name text;
BEGIN
  -- Find the constraint name on the role column natively
  SELECT tc.constraint_name INTO constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
  WHERE tc.table_name = 'profiles'
    AND ccu.column_name = 'role'
    AND tc.constraint_type = 'CHECK'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT ' || constraint_name;
  END IF;

  -- Add the new constraint
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('Owner', 'Admin', 'Manager', 'Deliver'));
END $$;
