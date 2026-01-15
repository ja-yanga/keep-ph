-- KYC Performance Optimization Migration
-- Run this in the Supabase SQL Editor to apply fixes.

-- 1. Enable pg_trgm for efficient fuzzy (ILIKE) searching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Add GIN Trigram indexes for first and last name search
-- This will fix the slow ILIKE matching on large datasets
CREATE INDEX IF NOT EXISTS idx_user_kyc_first_name_trgm 
ON public.user_kyc_table USING gin (user_kyc_first_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_user_kyc_last_name_trgm 
ON public.user_kyc_table USING gin (user_kyc_last_name gin_trgm_ops);

-- 3. Add index for sorting by submission date (descending)
-- This fixes the overhead of sorting on every page request
CREATE INDEX IF NOT EXISTS idx_user_kyc_submitted_at_desc 
ON public.user_kyc_table (user_kyc_submitted_at DESC NULLS LAST);

-- 4. Add composite index for the Lateral Address Join
-- This allows the database to find the latest address for a user instantly
CREATE INDEX IF NOT EXISTS idx_user_kyc_address_lookup 
ON public.user_kyc_address_table (user_kyc_id, user_kyc_address_created_at DESC);

-- 5. Clean up redundant index (identified in previous scan)
-- idx_user_kyc_user_id is redundant because user_kyc_table_user_id_key already exists
DROP INDEX IF EXISTS public.idx_user_kyc_user_id;

-- Analysis: After running this, re-run performance_diagnostic.sql
-- You should see Index Scans instead of Seq Scans.
