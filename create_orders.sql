-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    items_count INTEGER NOT NULL,
    total_amount TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    address TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create policy for all access (assuming local/test setup)
CREATE POLICY "Enable all for all" ON public.orders FOR ALL USING (true) WITH CHECK (true);

-- Insert demo order
INSERT INTO public.orders (order_number, customer_name, items_count, total_amount, status, address)
VALUES 
('#RK-9085', 'Test Mijoz (Ilovadan)', 2, '230,000 UZS', 'Pending', 'Toshkent sh., Yunusobod'),
('#RK-9086', 'Demo User', 1, '50,000 UZS', 'Picking', 'Toshkent sh., Chilonzor');
