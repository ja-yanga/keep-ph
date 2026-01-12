-- Performance Diagnostic Script for get_user_storage_files RPC
-- This script runs EXPLAIN ANALYZE on the RPC function with various scenarios
-- to identify performance bottlenecks and optimize query execution

-- Prerequisites:
-- 1. Replace 'c38a1897-c00c-41fd-8518-f66222e9333c' with an actual user_id from your database
-- 2. Ensure you have test data with varying dataset sizes:
--    - Small: < 100 files
--    - Medium: 100-1000 files
--    - Large: 1000-10000 files
--    - Very Large: > 10000 files

-- ============================================================================
-- TEST 1: Baseline - Fetch all files without filtering or pagination
-- ============================================================================
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON)
SELECT * FROM get_user_storage_files(
    'c38a1897-c00c-41fd-8518-f66222e9333c'::UUID, -- 'TEST_USER_ID_HERE'
    NULL,           -- no search
    'uploaded_at',  -- default sort
    'desc',         -- default direction
    10,             -- limit 10
    0               -- offset 0
);

-- ============================================================================
-- TEST 2: With Search Query (light pattern)
-- ============================================================================
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON)
SELECT * FROM get_user_storage_files(
    'c38a1897-c00c-41fd-8518-f66222e9333c'::UUID, -- 'TEST_USER_ID_HERE'
    'pdf',          -- search term
    'uploaded_at',
    'desc',
    10,
    0
);

-- ============================================================================
-- TEST 3: With Search Query (complex pattern)
-- ============================================================================
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON)
SELECT * FROM get_user_storage_files(
    'c38a1897-c00c-41fd-8518-f66222e9333c'::UUID, -- 'TEST_USER_ID_HERE'
    'document_2024_package',  -- complex search
    'uploaded_at',
    'desc',
    10,
    0
);

-- ============================================================================
-- TEST 4: Sort by File Name (ASC)
-- ============================================================================
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON)
SELECT * FROM get_user_storage_files(
    'c38a1897-c00c-41fd-8518-f66222e9333c'::UUID, -- 'TEST_USER_ID_HERE'
    NULL,
    'file_name',
    'asc',
    10,
    0
);

-- ============================================================================
-- TEST 5: Sort by File Size (DESC)
-- ============================================================================
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON)
SELECT * FROM get_user_storage_files(
    'c38a1897-c00c-41fd-8518-f66222e9333c'::UUID, -- 'TEST_USER_ID_HERE'
    NULL,
    'file_size_mb',
    'desc',
    10,
    0
);

-- ============================================================================
-- TEST 6: Pagination - First Page
-- ============================================================================
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON)
SELECT * FROM get_user_storage_files(
    'c38a1897-c00c-41fd-8518-f66222e9333c'::UUID, -- 'TEST_USER_ID_HERE'
    NULL,
    'uploaded_at',
    'desc',
    10,
    0
);

-- ============================================================================
-- TEST 7: Pagination - Middle Page (offset 50)
-- ============================================================================
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON)
SELECT * FROM get_user_storage_files(
    'c38a1897-c00c-41fd-8518-f66222e9333c'::UUID, -- 'TEST_USER_ID_HERE'
    NULL,
    'uploaded_at',
    'desc',
    10,
    50
);

-- ============================================================================
-- TEST 8: Pagination - Large Offset (offset 1000)
-- ============================================================================
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON)
SELECT * FROM get_user_storage_files(
    'c38a1897-c00c-41fd-8518-f66222e9333c'::UUID, -- 'TEST_USER_ID_HERE'
    NULL,
    'uploaded_at',
    'desc',
    10,
    1000
);

-- ============================================================================
-- TEST 9: Combined - Search + Sort + Pagination
-- ============================================================================
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON)
SELECT * FROM get_user_storage_files(
    'c38a1897-c00c-41fd-8518-f66222e9333c'::UUID, -- 'TEST_USER_ID_HERE'
    'scan',
    'file_name',
    'asc',
    25,
    10
);

-- ============================================================================
-- TEST 10: Maximum Limit (100 items)
-- ============================================================================
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON)
SELECT * FROM get_user_storage_files(
    'c38a1897-c00c-41fd-8518-f66222e9333c'::UUID, -- 'TEST_USER_ID_HERE'
    NULL,
    'uploaded_at',
    'desc',
    100,
    0
);

-- ============================================================================
-- SUPPORTING DIAGNOSTIC QUERIES
-- ============================================================================

-- Check index usage statistics
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan AS index_scans,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename IN (
    'mailroom_registration_table',
    'mailroom_file_table',
    'mailbox_item_table',
    'mailroom_plan_table'
)
ORDER BY idx_scan DESC;

-- Check table statistics
SELECT 
    schemaname,
    tablename,
    n_live_tup AS row_count,
    n_dead_tup AS dead_rows,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE tablename IN (
    'mailroom_registration_table',
    'mailroom_file_table',
    'mailbox_item_table',
    'mailroom_plan_table'
)
ORDER BY n_live_tup DESC;

-- Check index sizes
SELECT
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    idx_scan AS scans,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename IN (
    'mailroom_registration_table',
    'mailroom_file_table',
    'mailbox_item_table',
    'mailroom_plan_table'
)
ORDER BY pg_relation_size(indexrelid) DESC;

-- Check for missing indexes on foreign keys
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN (
        'mailroom_registration_table',
        'mailroom_file_table',
        'mailbox_item_table'
    )
    AND NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = tc.table_name
        AND indexdef LIKE '%' || kcu.column_name || '%'
    );

-- Analyze table statistics for query planner
ANALYZE mailroom_registration_table;
ANALYZE mailroom_file_table;
ANALYZE mailbox_item_table;
ANALYZE mailroom_plan_table;

-- ============================================================================
-- PERFORMANCE METRICS TO CHECK
-- ============================================================================
-- For each EXPLAIN ANALYZE output, check:
-- 1. Execution Time: Should be < 100ms for most queries
-- 2. Index Usage: Verify indexes are being used (Index Scan vs Seq Scan)
-- 3. Buffer Hits: Higher buffer hit ratio = better performance
-- 4. Rows Examined: Should be minimized with proper indexing
-- 5. Sort Operations: Ensure sorts are using indexes when possible
-- 6. Join Methods: Verify efficient join algorithms (Hash Join, Merge Join)

-- ============================================================================
-- EXPECTED PERFORMANCE BENCHMARKS
-- ============================================================================
-- Small dataset (< 100 files):     < 50ms
-- Medium dataset (100-1000):       < 100ms
-- Large dataset (1000-10000):      < 200ms
-- Very Large dataset (> 10000):    < 500ms

-- ============================================================================
-- COMMON OPTIMIZATION STRATEGIES
-- ============================================================================
-- 1. If Sequential Scans appear: Check if indexes exist and are being used
-- 2. If high buffer misses: Increase shared_buffers or check cache hit ratio
-- 3. If slow sorts: Ensure sort columns are indexed
-- 4. If slow pagination with large offsets: Consider cursor-based pagination
-- 5. If slow ILIKE searches: Consider full-text search (pg_trgm extension)
