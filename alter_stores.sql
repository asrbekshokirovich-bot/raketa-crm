ALTER TABLE public.stores DROP CONSTRAINT IF EXISTS stores_status_check;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.stores ADD CONSTRAINT stores_status_check CHECK (status IN ('Active', 'Inactive', '24/7'));
