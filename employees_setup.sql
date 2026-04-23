-- Supabase SQL to create Employee Salaries table
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL,
    salary NUMERIC NOT NULL DEFAULT 0
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read/write access to employees" ON public.employees FOR ALL USING (true);

-- Optional mock data for testing
INSERT INTO public.employees (full_name, role, salary) VALUES 
('Murodov Murod', 'CEO / Rahbar', 6000000),
('Alimov Ali', 'Menedjer', 3000000);
