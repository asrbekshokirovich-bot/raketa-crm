-- Inventory Automation for RAKETA CRM
-- Automatically deducts stock on order and restores on cancellation

-- 1. Ensure stock cannot be negative (prevents overselling)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_not_negative') THEN
        ALTER TABLE public.products ADD CONSTRAINT stock_not_negative CHECK (stock >= 0);
    END IF;
END $$;

-- 2. Function to deduct stock when an item is added to an order
CREATE OR REPLACE FUNCTION public.handle_order_item_stock_deduction()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.products
    SET stock = stock - NEW.quantity
    WHERE id = NEW.product_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger for deduction
DROP TRIGGER IF EXISTS tr_deduct_stock_on_order ON public.order_items;
CREATE TRIGGER tr_deduct_stock_on_order
AFTER INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.handle_order_item_stock_deduction();

-- 4. Function to restore stock when an order is cancelled
CREATE OR REPLACE FUNCTION public.handle_order_cancellation_stock_restoration()
RETURNS TRIGGER AS $$
BEGIN
    -- Only act if status changed to 'Cancelled'
    -- Note: Status names should match CRM (Cancelled)
    IF (NEW.status = 'Cancelled' AND (OLD.status IS NULL OR OLD.status != 'Cancelled')) THEN
        UPDATE public.products p
        SET stock = p.stock + oi.quantity
        FROM public.order_items oi
        WHERE oi.order_id = NEW.id
        AND p.id = oi.product_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger for restoration
DROP TRIGGER IF EXISTS tr_restore_stock_on_cancellation ON public.orders;
CREATE TRIGGER tr_restore_stock_on_cancellation
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_order_cancellation_stock_restoration();
