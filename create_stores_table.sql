CREATE TABLE IF NOT EXISTS public.stores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    manager_name TEXT NOT NULL,
    manager_phone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS policies
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all users to read stores" 
ON public.stores 
FOR SELECT 
USING (true);

CREATE POLICY "Allow owner and admins to insert stores" 
ON public.stores 
FOR INSERT 
WITH CHECK (
  auth.role() = 'authenticated' AND 
  (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role IN ('Owner', 'Admin')
  ))
);

CREATE POLICY "Allow owner and admins to update stores" 
ON public.stores 
FOR UPDATE 
USING (
  auth.role() = 'authenticated' AND 
  (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role IN ('Owner', 'Admin')
  ))
);

CREATE POLICY "Allow owner and admins to delete stores" 
ON public.stores 
FOR DELETE 
USING (
  auth.role() = 'authenticated' AND 
  (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role IN ('Owner', 'Admin')
  ))
);
