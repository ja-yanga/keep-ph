-- Performance Optimization Migration for get_user_mailroom_registrations
-- This migration adds indexes to optimize search, filtering, and pagination performance

-- 1. Enable pg_trgm extension for efficient fuzzy (LIKE/ILIKE) searching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Add GIN Trigram indexes for location and plan name search
-- This will significantly improve ILIKE pattern matching performance
-- Using ILIKE (case-insensitive LIKE) works optimally with trigram indexes
CREATE INDEX IF NOT EXISTS idx_mailroom_location_name_trgm 
ON public.mailroom_location_table USING gin (mailroom_location_name gin_trgm_ops)
WHERE mailroom_location_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mailroom_plan_name_trgm 
ON public.mailroom_plan_table USING gin (mailroom_plan_name gin_trgm_ops)
WHERE mailroom_plan_name IS NOT NULL;

-- 3. Add index for sorting by registration created_at (descending)
-- This fixes the overhead of sorting on every page request
CREATE INDEX IF NOT EXISTS idx_mailroom_registration_created_at_desc 
ON public.mailroom_registration_table (mailroom_registration_created_at DESC NULLS LAST);

-- 4. Composite index for user_id + created_at (descending)
-- This optimizes the common query pattern: filter by user, sort by date
CREATE INDEX IF NOT EXISTS idx_mailroom_registration_user_created_desc 
ON public.mailroom_registration_table (user_id, mailroom_registration_created_at DESC NULLS LAST);

-- 5. Index on user_id for fast filtering (if not already exists)
-- This is likely already present but ensuring it exists for completeness
CREATE INDEX IF NOT EXISTS idx_mailroom_registration_user_id 
ON public.mailroom_registration_table (user_id)
WHERE user_id IS NOT NULL;

-- 6. Index on mailroom_location_id for join performance
CREATE INDEX IF NOT EXISTS idx_mailroom_registration_location_id 
ON public.mailroom_registration_table (mailroom_location_id)
WHERE mailroom_location_id IS NOT NULL;

-- 7. Index on mailroom_plan_id for join performance
CREATE INDEX IF NOT EXISTS idx_mailroom_registration_plan_id 
ON public.mailroom_registration_table (mailroom_plan_id)
WHERE mailroom_plan_id IS NOT NULL;

-- 8. Index on location table primary key join (likely already exists, but ensuring)
CREATE INDEX IF NOT EXISTS idx_mailroom_location_id 
ON public.mailroom_location_table (mailroom_location_id);

-- 9. Index on plan table primary key join (likely already exists, but ensuring)
CREATE INDEX IF NOT EXISTS idx_mailroom_plan_id 
ON public.mailroom_plan_table (mailroom_plan_id);

-- 10. Index on subscription_table for join performance
CREATE INDEX IF NOT EXISTS idx_subscription_registration_id 
ON public.subscription_table (mailroom_registration_id)
WHERE mailroom_registration_id IS NOT NULL;

-- Analysis: After running this, re-run performance_diagnostic_get_user_mailroom_registrations.sql
-- You should see Index Scans instead of Seq Scans, and faster query execution times.
