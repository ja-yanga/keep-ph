-- ============================================================================
-- Mailroom Performance Benchmarking
-- Run this script in the Supabase SQL Editor to analyze query performance
-- Target: mailroom_location_table and location_locker_table (50,000 records)
-- ============================================================================

-- 0. Update statistics and check counts
ANALYZE public.mailroom_location_table;
ANALYZE public.location_locker_table;
ANALYZE public.mailroom_assigned_locker_table;

SELECT 'Location Count', COUNT(*) FROM public.mailroom_location_table
UNION ALL
SELECT 'Locker Count', COUNT(*) FROM public.location_locker_table
UNION ALL
SELECT 'Assigned Count', COUNT(*) FROM public.mailroom_assigned_locker_table;

-- 1. Benchmarking Location Listing
-- This is used by /api/admin/mailroom/locations
EXPLAIN ANALYZE 
SELECT * FROM public.mailroom_location_table ORDER BY mailroom_location_name ASC;

-- 2. Benchmarking Locker Listing (Mimicking API with Pagination)
-- Using LIMIT ensures Postgres uses the B-tree index for ordering, 
-- avoiding a full table Seq Scan and an expensive "External Merge Disk" sort.
EXPLAIN ANALYZE
SELECT 
  l.*,
  loc.mailroom_location_name,
  al.mailroom_assigned_locker_status
FROM public.location_locker_table l
LEFT JOIN public.mailroom_location_table loc ON l.mailroom_location_id = loc.mailroom_location_id
LEFT JOIN public.mailroom_assigned_locker_table al ON l.location_locker_id = al.location_locker_id
ORDER BY l.location_locker_code ASC
LIMIT 50;

-- 3. Benchmarking Locker Filtering (Searching by code)
EXPLAIN ANALYZE
SELECT 
  l.*,
  loc.mailroom_location_name
FROM public.location_locker_table l
JOIN public.mailroom_location_table loc ON l.mailroom_location_id = loc.mailroom_location_id
WHERE l.location_locker_code ILIKE '%L-001%'
LIMIT 20;

-- 4. Benchmarking Locker Filtering (By Location)
EXPLAIN ANALYZE
SELECT 
  l.*
FROM public.location_locker_table l
WHERE l.mailroom_location_id = (SELECT mailroom_location_id FROM public.mailroom_location_table LIMIT 1)
LIMIT 20;

-- 5. Benchmarking Assigned Lockers Listing
EXPLAIN ANALYZE
SELECT 
  * 
FROM public.mailroom_assigned_locker_table
LIMIT 100;

-- 6. Benchmarking Status Filtering (Available vs Occupied)
-- This tests the new idx_locker_is_available index
EXPLAIN ANALYZE
SELECT COUNT(*) 
FROM public.location_locker_table 
WHERE location_locker_is_available = true;

-- 7. Benchmarking Mailbox Items (50,000+ Records)
-- This used by the package management screens
EXPLAIN ANALYZE
SELECT 
  * 
FROM public.mailbox_item_table 
ORDER BY mailbox_item_received_at DESC 
LIMIT 50;

-- 8. Benchmarking Mailbox Item Search
-- This tests the new GIN index on mailbox_item_name
EXPLAIN ANALYZE
SELECT 
  * 
FROM public.mailbox_item_table 
WHERE mailbox_item_name ILIKE '%Package%'
LIMIT 20;

-- ============================================================================
-- SQL Best Practices
-- ============================================================================

-- If Query #2 still shows a Sort, consider physical clustering:
-- CLUSTER public.location_locker_table USING idx_location_locker_code_btree;

-- If Query #7 is slow, cluster it too:
-- CLUSTER public.mailbox_item_table USING idx_mailbox_item_received_at_btree;
