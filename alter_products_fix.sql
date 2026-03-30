ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_created_by_fkey;
ALTER TABLE public.products ADD CONSTRAINT products_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
