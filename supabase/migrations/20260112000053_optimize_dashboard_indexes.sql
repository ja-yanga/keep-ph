-- Optimization for Admin Dashboard Performance
-- Addresses User Request: "Is there a chance that the rpc is causing a slow"

-- 1. Index for "Recent Packages" (Sorting by date)
-- This allows the DB to grab the top 5 rows instantly without scanning the whole table.
CREATE INDEX IF NOT EXISTS idx_mailbox_item_received_at_desc
ON public.mailbox_item_table (mailbox_item_received_at DESC NULLS LAST);

-- 2. Index for "Pending/Stored" counts (Filtering by status)
-- A detailed index covering status and deleted_at makes the counters extremely fast.
CREATE INDEX IF NOT EXISTS idx_mailbox_item_status_active
ON public.mailbox_item_table (mailbox_item_status)
WHERE mailbox_item_deleted_at IS NULL;

-- 3. Index for Locker Locations (Active check)
CREATE INDEX IF NOT EXISTS idx_location_locker_active
ON public.location_locker_table (location_locker_id)
WHERE location_locker_deleted_at IS NULL;

-- 4. Analyzy tables to ensure stats are up to date for the query planner
ANALYZE public.mailbox_item_table;
ANALYZE public.location_locker_table;
