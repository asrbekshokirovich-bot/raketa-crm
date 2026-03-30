-- 1. E'lonlar uchun yangi jadval yaratish
CREATE TABLE IF NOT EXISTS product_listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  price TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT DEFAULT 'Active',
  image_url TEXT,
  images TEXT[], -- rasmlar public URL lari array ko'rinishida
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Jadvalga barcha uchun O'qish (Read) va Yozish (Insert) ruxsatini berish (RLS o'chirilgan holatda yoki policy orqali)
-- Agar RLS (Row Level Security) yoqilgan bo'lsa:
ALTER TABLE product_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public o'qishi mumkin" ON product_listings FOR SELECT USING (true);
CREATE POLICY "Public yoza oladi" ON product_listings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public yangilay oladi" ON product_listings FOR UPDATE USING (true);
CREATE POLICY "Public o'chira oladi" ON product_listings FOR DELETE USING (true);

-- 3. Rasmlarni saqlash uchun YANADA bitta Storage Bucket yaratish kerak.
-- Buni Supabase Dashboard -> "Storage" bo'limidan "New bucket" tugmasi orqali qiling.
-- Nomi: "listings"
-- "Public bucket" belgisini (galochka) yoqishni unutmang!
