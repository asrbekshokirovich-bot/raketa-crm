-- Supabase SQL Setup for RAKETA CRM

-- 1. Create Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price NUMERIC NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    image_url TEXT
);

-- 2. Create Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    shipping_address TEXT NOT NULL,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'))
);

-- 3. Create Order Items Table (Junction Table)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 1,
    price_at_time NUMERIC NOT NULL
);

-- 4. Create Deliveries Table
CREATE TABLE IF NOT EXISTS public.deliveries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    driver_name TEXT NOT NULL,
    vehicle_number TEXT,
    status TEXT NOT NULL DEFAULT 'Assigned' CHECK (status IN ('Assigned', 'Picked Up', 'On The Way', 'Delivered', 'Failed')),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    delivered_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security (RLS) but allow all operations for now (Since we are using Anon Key for rapid prototyping)
-- WARNING: In a production app with real users, you should set up proper RLS policies based on auth.uid()
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read/write access to products" ON public.products FOR ALL USING (true);
CREATE POLICY "Allow anonymous read/write access to orders" ON public.orders FOR ALL USING (true);
CREATE POLICY "Allow anonymous read/write access to order_items" ON public.order_items FOR ALL USING (true);
CREATE POLICY "Allow anonymous read/write access to deliveries" ON public.deliveries FOR ALL USING (true);

-- Insert dummy data into Products
INSERT INTO public.products (name, category, price, stock, image_url) VALUES 
('Olma (Apple)', 'Meva', 15000, 100, '🍎'),
('Banan', 'Meva', 22000, 50, '🍌'),
('Sut', 'Sut mahsulotlari', 12000, 40, '🥛'),
('Non', 'Novvoyxona', 4000, 200, '🍞');
