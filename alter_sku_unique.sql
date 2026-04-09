-- Drop the restrictive global constraint that prevents branches from sharing SKUs
ALTER TABLE "public"."products" DROP CONSTRAINT IF EXISTS "products_sku_key";

-- Add a more flexible constraint that still prevents duplicates WITHIN the SAME branch,
-- but allows different branches to safely register the EXACT SAME SKU.
ALTER TABLE "public"."products" ADD CONSTRAINT "products_sku_store_id_key" UNIQUE ("sku", "store_id");
