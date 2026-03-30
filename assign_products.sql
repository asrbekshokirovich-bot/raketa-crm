UPDATE public.products 
SET 
  created_by = (SELECT id FROM public.profiles WHERE full_name ILIKE '%Sharofiddin%' LIMIT 1),
  store_id = (SELECT store_id FROM public.profiles WHERE full_name ILIKE '%Sharofiddin%' LIMIT 1)
WHERE created_by IS NULL OR store_id IS NULL;
