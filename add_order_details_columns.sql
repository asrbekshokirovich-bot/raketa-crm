-- Add discount and promo code columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS promo_code TEXT,
ADD COLUMN IF NOT EXISTS items_subtotal NUMERIC DEFAULT 0;

-- Optional: Update existing orders to have total_amount as items_subtotal if needed
-- This depends on how total_amount was being used previously.
