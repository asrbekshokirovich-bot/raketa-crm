-- Jadvalga OYLIK MAOSH kolumnini qo'shish!
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS salary NUMERIC DEFAULT 0;
