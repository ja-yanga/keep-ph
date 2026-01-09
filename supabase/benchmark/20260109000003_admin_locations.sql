-- ============================================================================
-- Mailroom Locations Performance Benchmarking
-- Run this script in the Supabase SQL Editor to analyze query performance
-- Target: mailroom_location_table (High Volume Performance)
-- ============================================================================

-- 0. Update statistics and check counts
ANALYZE public.mailroom_location_table;

SELECT 'Location Count', COUNT(*) FROM public.mailroom_location_table;

-- 1. Benchmarking the new RPC (rpc_list_mailroom_locations)
-- This tests the overall performance of search, filter, and sort combined
EXPLAIN ANALYZE
SELECT * FROM public.rpc_list_mailroom_locations(
    'Location', -- search (Hit name or prefix)
    '',         -- region (Filter)
    '',         -- city (Filter)
    'name_asc', -- sort
    10,         -- limit
    0           -- offset
);

-- 2. Benchmarking Search Performance (Fuzzy/ILIKE)
-- This tests the GIN indexes on name and prefix
EXPLAIN ANALYZE
SELECT 
    mailroom_location_id,
    mailroom_location_name,
    mailroom_location_prefix
FROM public.mailroom_location_table
WHERE mailroom_location_name ILIKE '%Makati%'
   OR mailroom_location_prefix ILIKE '%MKT%'
LIMIT 20;

-- 3. Benchmarking Filtering Performance (Region & City)
-- This tests the B-tree indexes for exact matching
EXPLAIN ANALYZE
SELECT 
    mailroom_location_id,
    mailroom_location_name,
    mailroom_location_region,
    mailroom_location_city
FROM public.mailroom_location_table
WHERE mailroom_location_region = 'NCR'
  AND mailroom_location_city = 'Makati'
LIMIT 50;

-- 4. Benchmarking Sorting Performance (Total Lockers)
-- This tests the index for "Sort By Lockers" functionality
EXPLAIN ANALYZE
SELECT 
    mailroom_location_id,
    mailroom_location_name,
    mailroom_location_total_lockers
FROM public.mailroom_location_table
ORDER BY mailroom_location_total_lockers DESC
LIMIT 10;

-- 5. Benchmarking Pagination Overhead
-- Tests deep paging performance
EXPLAIN ANALYZE
SELECT * FROM public.rpc_list_mailroom_locations(
    '',         -- search
    '',         -- region
    '',         -- city
    'name_asc', 
    50,         -- limit
    500         -- deep offset
);

-- 6. Benchmarking Total Count (Window Function)
-- The RPC uses COUNT(*) OVER() for pagination; this checks its impact
EXPLAIN ANALYZE
SELECT 
    mailroom_location_name,
    COUNT(*) OVER()
FROM public.mailroom_location_table
WHERE mailroom_location_region = 'NCR'
LIMIT 10;

-- 7. Benchmarking Data Modification (NEW)
-- Tracking the overhead of GIN indexes during inserts and updates

BEGIN; -- Start transaction to allow rollback after benchmarking
EXPLAIN ANALYZE
INSERT INTO public.mailroom_location_table (
    mailroom_location_name,
    mailroom_location_prefix,
    mailroom_location_region,
    mailroom_location_city,
    mailroom_location_total_lockers
) VALUES (
    'Benchmark Location',
    'B-001',
    'NCR',
    'Makati',
    50
);
ROLLBACK; -- Undo the insert

BEGIN;
EXPLAIN ANALYZE
UPDATE public.mailroom_location_table 
SET mailroom_location_name = 'Updated Bench Location'
WHERE mailroom_location_id = (SELECT mailroom_location_id FROM public.mailroom_location_table LIMIT 1);
ROLLBACK; -- Undo the update

-- ============================================================================
-- SQL Best Practices & Maintenance
-- ============================================================================

-- If the queries above still show a "Seq Scan" (Sequential Scan), it is likely 
-- because your current dataset is too small (Postgres prefers Seq Scan for < 1000 rows).
-- To see the indexes in action, you can seed more data:
-- 
-- DO $$
-- BEGIN
--   FOR i IN 1..50000 LOOP
--     INSERT INTO public.mailroom_location_table (...) VALUES (...);
--   END LOOP;
-- END $$;

-- If Query #4 is slow even with an index, consider clustering
-- CLUSTER public.mailroom_location_table USING idx_location_total_lockers_btree;
