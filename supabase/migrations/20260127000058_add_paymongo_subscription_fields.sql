-- Add PayMongo subscription and plan ID fields to subscription_table
ALTER TABLE public.subscription_table
ADD COLUMN IF NOT EXISTS paymongo_plan_id TEXT,
ADD COLUMN IF NOT EXISTS paymongo_subscription_id TEXT;

-- Add index for PayMongo subscription ID lookups
CREATE INDEX IF NOT EXISTS idx_subscription_paymongo_subscription_id 
ON public.subscription_table (paymongo_subscription_id);

-- Add index for PayMongo plan ID lookups
CREATE INDEX IF NOT EXISTS idx_subscription_paymongo_plan_id 
ON public.subscription_table (paymongo_plan_id);

-- Add comment for documentation
COMMENT ON COLUMN public.subscription_table.paymongo_plan_id IS 'PayMongo Plan ID for recurring subscription billing';
COMMENT ON COLUMN public.subscription_table.paymongo_subscription_id IS 'PayMongo Subscription ID for tracking recurring payments';
