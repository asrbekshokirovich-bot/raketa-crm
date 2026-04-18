-- Create promo_codes table
CREATE TABLE IF NOT EXISTS public.promo_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    target TEXT NOT NULL CHECK (target IN ('products', 'delivery')),
    type TEXT NOT NULL CHECK (type IN ('percent', 'amount')),
    value NUMERIC NOT NULL,
    user_limit INTEGER NOT NULL DEFAULT 1,
    total_limit INTEGER NOT NULL DEFAULT 100,
    used_count INTEGER NOT NULL DEFAULT 0,
    min_amount NUMERIC NOT NULL DEFAULT 0,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Create policy for all access (assuming admin usage via anon key for now)
CREATE POLICY "Enable all for all" ON public.promo_codes FOR ALL USING (true) WITH CHECK (true);
