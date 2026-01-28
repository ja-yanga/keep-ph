-- Performance Optimization Migration for get_transactions RPC
-- This migration adds indexes to optimize search, filtering, sorting, and pagination performance
-- for the get_transactions function

-- 1. Enable pg_trgm extension for efficient fuzzy (LIKE/ILIKE) searching
-- This improves ILIKE pattern matching performance on search fields
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Add indexes for sorting operations (with DESC direction for common descending sorts)
-- These indexes optimize the ORDER BY clauses in get_transactions

-- Index for sorting by payment_transaction_date (descending - most common)
CREATE INDEX IF NOT EXISTS idx_payment_transaction_date_desc 
ON public.payment_transaction_table (payment_transaction_date DESC NULLS LAST);

-- Index for sorting by payment_transaction_created_at (descending)
CREATE INDEX IF NOT EXISTS idx_payment_transaction_created_at_desc 
ON public.payment_transaction_table (payment_transaction_created_at DESC NULLS LAST);

-- Index for sorting by payment_transaction_updated_at (descending)
CREATE INDEX IF NOT EXISTS idx_payment_transaction_updated_at_desc 
ON public.payment_transaction_table (payment_transaction_updated_at DESC NULLS LAST);

-- Add ASC indexes for ascending sorts (needed when sort_dir = 'asc')
-- Index for sorting by payment_transaction_date (ascending)
CREATE INDEX IF NOT EXISTS idx_payment_transaction_date_asc 
ON public.payment_transaction_table (payment_transaction_date ASC NULLS LAST);

-- Index for sorting by payment_transaction_created_at (ascending)
CREATE INDEX IF NOT EXISTS idx_payment_transaction_created_at_asc 
ON public.payment_transaction_table (payment_transaction_created_at ASC NULLS LAST);

-- Index for sorting by payment_transaction_updated_at (ascending)
CREATE INDEX IF NOT EXISTS idx_payment_transaction_updated_at_asc 
ON public.payment_transaction_table (payment_transaction_updated_at ASC NULLS LAST);

-- 3. Add indexes for search operations (reference fields used in ILIKE searches)
-- These indexes improve search performance on payment_transaction_reference_id, 
-- payment_transaction_reference, and payment_transaction_order_id

-- Index for payment_transaction_reference_id (for search)
CREATE INDEX IF NOT EXISTS idx_payment_transaction_reference_id 
ON public.payment_transaction_table (payment_transaction_reference_id)
WHERE payment_transaction_reference_id IS NOT NULL;

-- Index for payment_transaction_reference (for search)
CREATE INDEX IF NOT EXISTS idx_payment_transaction_reference 
ON public.payment_transaction_table (payment_transaction_reference)
WHERE payment_transaction_reference IS NOT NULL;

-- 4. Add GIN Trigram indexes for better ILIKE search performance (optional but recommended)
-- These significantly improve pattern matching performance for partial text searches
-- Using ILIKE (case-insensitive LIKE) works optimally with trigram indexes

-- GIN Trigram index for payment_transaction_reference_id
CREATE INDEX IF NOT EXISTS idx_payment_transaction_reference_id_trgm 
ON public.payment_transaction_table USING gin (payment_transaction_reference_id gin_trgm_ops)
WHERE payment_transaction_reference_id IS NOT NULL;

-- GIN Trigram index for payment_transaction_reference
CREATE INDEX IF NOT EXISTS idx_payment_transaction_reference_trgm 
ON public.payment_transaction_table USING gin (payment_transaction_reference gin_trgm_ops)
WHERE payment_transaction_reference IS NOT NULL;

-- GIN Trigram index for payment_transaction_order_id
CREATE INDEX IF NOT EXISTS idx_payment_transaction_order_id_trgm 
ON public.payment_transaction_table USING gin (payment_transaction_order_id gin_trgm_ops)
WHERE payment_transaction_order_id IS NOT NULL;

-- 5. Ensure foreign key indexes exist for join performance
-- These should already exist but we ensure they're present for optimal join performance

-- Index on mailroom_registration_id (for joining with mailroom_registration_table)
CREATE INDEX IF NOT EXISTS idx_payment_transaction_registration_id 
ON public.payment_transaction_table (mailroom_registration_id)
WHERE mailroom_registration_id IS NOT NULL;

-- Index on mailroom_registration_table.user_id (for filtering by user_ids)
-- This should already exist, but ensuring it's present
CREATE INDEX IF NOT EXISTS idx_mailroom_registration_user_id 
ON public.mailroom_registration_table (user_id)
WHERE user_id IS NOT NULL;

-- Index on users_table.users_id (primary key, should already exist)
-- This is typically auto-created, but we ensure it exists
CREATE INDEX IF NOT EXISTS idx_users_id 
ON public.users_table (users_id)
WHERE users_id IS NOT NULL;

-- Index on user_kyc_table.user_id (for joining with user_kyc_table)
-- This should already exist, but ensuring it's present
CREATE INDEX IF NOT EXISTS idx_user_kyc_user_id 
ON public.user_kyc_table (user_id)
WHERE user_id IS NOT NULL;

-- 6. Composite indexes for common query patterns
-- These optimize queries that filter and sort together

-- Composite index for filtering by user (via mailroom_registration) and sorting by date
-- This optimizes customer view queries: filter by user_id, sort by transaction_date
CREATE INDEX IF NOT EXISTS idx_payment_transaction_registration_date_desc 
ON public.payment_transaction_table (mailroom_registration_id, payment_transaction_date DESC NULLS LAST)
WHERE mailroom_registration_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_covering_for_transactions 
ON public.users_table (users_id) 
INCLUDE (
  users_email,
  users_role,
  users_avatar_url,
  users_is_verified,
  mobile_number,
  users_created_at
);

-- Covering index for user_kyc_table lookups
-- Includes all columns used in get_transactions KYC data joins
CREATE INDEX IF NOT EXISTS idx_user_kyc_covering_for_transactions 
ON public.user_kyc_table (user_id) 
INCLUDE (
  user_kyc_id,
  user_kyc_first_name,
  user_kyc_last_name,
  user_kyc_status,
  user_kyc_id_number,
  user_kyc_id_document_type,
  user_kyc_date_of_birth
);

-- 7. Analyze tables to update statistics for query planner
-- This helps PostgreSQL choose optimal query plans
ANALYZE payment_transaction_table;
ANALYZE mailroom_registration_table;
ANALYZE users_table;
ANALYZE user_kyc_table;

-- ============================================================================
-- NOTES
-- ============================================================================
-- After running this migration, you should see improved performance in:
-- 1. Sorting operations (using Index Scan instead of Sort)
-- 2. Search operations (using GIN indexes for ILIKE patterns)
-- 3. Join operations (using Index Nested Loop instead of Hash Join where appropriate)
-- 4. Filter operations (using indexes for user_id filtering)
--
-- To verify improvements, run the benchmark script:
-- supabase/benchmark/20260112000056_get_transactions.sql
--
-- Expected improvements:
-- - Sort operations: Should use Index Scan instead of Sort
-- - Search queries: Should use GIN index scans for ILIKE patterns
-- - Join performance: Should use Index Nested Loop for foreign key joins
-- - Overall execution time: Should be reduced by 50-80% depending on dataset size
