-- ============================================================================
-- Dashboard Optimization Indexes
-- ============================================================================

-- 1. Index for "Recent Packages" (Sort-only optimization)
-- Target Query: SELECT ... ORDER BY received_at DESC LIMIT 5 WHERE deleted_at IS NULL
--
-- This strictly optimizes the "Recent Packages" section. By having a partial index 
-- on 'received_at' for non-deleted items, Postgres can instantly grab the top 5 
-- items without scanning the table or sorting memory.
CREATE INDEX IF NOT EXISTS idx_mailbox_item_recent_perf
ON public.mailbox_item_table (mailbox_item_received_at DESC NULLS LAST)
WHERE mailbox_item_deleted_at IS NULL;

-- 2. Index for "Status Counts" (Filter optimization)
-- Target Query: COUNT(*) ... WHERE status IN (...) AND deleted_at IS NULL
--
-- This allows Postgres to use a Bitmap Index Scan or Index Only Scan to count 
-- items by status very quickly. We include 'received_at' to cover future 
-- "List packages by status date" queries efficiently too (covering index).
CREATE INDEX IF NOT EXISTS idx_mailbox_item_status_perf
ON public.mailbox_item_table (mailbox_item_status, mailbox_item_received_at DESC NULLS LAST)
WHERE mailbox_item_deleted_at IS NULL;

-- 3. Maintenance
-- Update statistics to ensure the query planner sees these new indexes immediately.
ANALYZE public.mailbox_item_table;
