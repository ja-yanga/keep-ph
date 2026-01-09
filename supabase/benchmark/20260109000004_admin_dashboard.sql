-- ============================================================================
-- Admin Dashboard Performance Benchmarking
-- Run this script in the Supabase SQL Editor to analyze query performance
-- Target: admin_dashboard_stats()
-- ============================================================================

-- 0. Update statistics
ANALYZE public.mailbox_item_table;
ANALYZE public.mailroom_registration_table;
ANALYZE public.location_locker_table;
ANALYZE public.mailroom_assigned_locker_table;

-- 1. Benchmarking the full RPC
-- This tests the overall performance of the whole dashboard aggregation
EXPLAIN ANALYZE
SELECT public.admin_dashboard_stats();

-- 2. Benchmarking Count Logic (Pending & Stored)
-- This specific query handles the main count stats
EXPLAIN ANALYZE
SELECT
  COUNT(*) FILTER (
    WHERE mailbox_item_status IN ('REQUEST_TO_SCAN', 'REQUEST_TO_RELEASE', 'REQUEST_TO_DISPOSE')
    AND mailbox_item_deleted_at IS NULL
  ) AS pending_count,
  COUNT(*) FILTER (
    WHERE mailbox_item_status IN ('STORED', 'REQUEST_TO_SCAN', 'REQUEST_TO_RELEASE', 'REQUEST_TO_DISPOSE')
    AND mailbox_item_deleted_at IS NULL
  ) AS stored_count
FROM public.mailbox_item_table;

-- 3. Benchmarking "Recent Packages" Logic
-- This tests the optimized base-table scan before joins
EXPLAIN ANALYZE
SELECT
  mailbox_item_id,
  mailbox_item_received_at
FROM public.mailbox_item_table
WHERE mailbox_item_deleted_at IS NULL
ORDER BY mailbox_item_received_at DESC NULLS LAST
LIMIT 5;

-- 4. Benchmarking the joins for "Recent Packages"
-- This tests the actual join performance for those 5 items
EXPLAIN ANALYZE
SELECT
  mi.mailbox_item_id,
  COALESCE(
    CONCAT_WS(' ', uk.user_kyc_first_name, uk.user_kyc_last_name),
    ml.mailroom_location_name
  ) AS full_name
FROM public.mailbox_item_table mi
LEFT JOIN public.mailroom_registration_table mr ON mr.mailroom_registration_id = mi.mailroom_registration_id
LEFT JOIN public.mailroom_location_table ml ON ml.mailroom_location_id = mr.mailroom_location_id
LEFT JOIN public.users_table u ON u.users_id = mr.user_id
LEFT JOIN public.user_kyc_table uk ON uk.user_id = u.users_id
WHERE mi.mailbox_item_deleted_at IS NULL
ORDER BY mi.mailbox_item_received_at DESC NULLS LAST
LIMIT 5;

-- ============================================================================
-- Proposed Optimization: Composite Index
-- ============================================================================
-- If you see "Seq Scan" in Query #2 or #3 above, run these:
--
-- CREATE INDEX IF NOT EXISTS idx_mailbox_item_stats_optimization 
-- ON public.mailbox_item_table (mailbox_item_status, mailbox_item_received_at DESC)
-- WHERE mailbox_item_deleted_at IS NULL;
--
-- ANALYZE public.mailbox_item_table;
