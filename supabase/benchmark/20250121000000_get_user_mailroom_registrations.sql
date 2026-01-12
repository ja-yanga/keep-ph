-- Performance Diagnostic Script for get_user_mailroom_registrations RPC
-- This script runs EXPLAIN ANALYZE on the RPC function with various scenarios
-- to identify performance bottlenecks and optimize query execution

-- Prerequisites:
-- 1. Replace 'YOUR_USER_ID_HERE' with an actual user_id from your database
-- 2. Ensure you have test data with varying dataset sizes:
--    - Small: < 10 registrations
--    - Medium: 10-50 registrations
--    - Large: 50-200 registrations
--    - Very Large: > 200 registrations

-- ============================================================================
-- TEST 1: Baseline - Fetch all registrations without filtering or pagination
-- ============================================================================
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON)
SELECT * FROM get_user_mailroom_registrations(
    'YOUR_USER_ID_HERE'::UUID,  -- Replace with actual user_id
    NULL,                        -- no search
    NULL,                        -- no limit (return all)
    0                            -- no offset
);

-- ============================================================================
-- TEST 2: With Search Query (location name)
-- ============================================================================
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON)
SELECT * FROM get_user_mailroom_registrations(
    'YOUR_USER_ID_HERE'::UUID,  -- Replace with actual user_id
    'Manila',                    -- search term (location name)
    NULL,
    0
);

-- ============================================================================
-- TEST 3: With Search Query (plan name)
-- ============================================================================
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON)
SELECT * FROM get_user_mailroom_registrations(
    'YOUR_USER_ID_HERE'::UUID,  -- Replace with actual user_id
    'Premium',                   -- search term (plan name)
    NULL,
    0
);

-- ============================================================================
-- TEST 4: With Search Query (partial match)
-- ============================================================================
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON)
SELECT * FROM get_user_mailroom_registrations(
    'YOUR_USER_ID_HERE'::UUID,  -- Replace with actual user_id
    'Man',                       -- partial search term
    NULL,
    0
);

-- ============================================================================
-- TEST 5: Pagination - First Page (limit 2)
-- ============================================================================
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON)
SELECT * FROM get_user_mailroom_registrations(
    'YOUR_USER_ID_HERE'::UUID,  -- Replace with actual user_id
    NULL,
    2,                           -- limit 2
    0                            -- offset 0
);

-- ============================================================================
-- TEST 6: Pagination - Second Page (limit 2, offset 2)
-- ============================================================================
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON)
SELECT * FROM get_user_mailroom_registrations(
    'YOUR_USER_ID_HERE'::UUID,  -- Replace with actual user_id
    NULL,
    2,                           -- limit 2
    2                            -- offset 2
);

-- ============================================================================
-- TEST 7: Pagination - Middle Page (limit 10, offset 20)
-- ============================================================================
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON)
SELECT * FROM get_user_mailroom_registrations(
    'YOUR_USER_ID_HERE'::UUID,  -- Replace with actual user_id
    NULL,
    10,                          -- limit 10
    20                           -- offset 20
);

-- ============================================================================
-- TEST 8: Pagination - Large Offset (limit 10, offset 100)
-- ============================================================================
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON)
SELECT * FROM get_user_mailroom_registrations(
    'YOUR_USER_ID_HERE'::UUID,  -- Replace with actual user_id
    NULL,
    10,                          -- limit 10
    100                          -- offset 100
);

-- ============================================================================
-- TEST 9: Combined - Search + Pagination (location search)
-- ============================================================================
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON)
SELECT * FROM get_user_mailroom_registrations(
    'YOUR_USER_ID_HERE'::UUID,  -- Replace with actual user_id
    'Makati',                    -- search term
    5,                           -- limit 5
    0                            -- offset 0
);

-- ============================================================================
-- TEST 10: Combined - Search + Pagination (plan search)
-- ============================================================================
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON)
SELECT * FROM get_user_mailroom_registrations(
    'YOUR_USER_ID_HERE'::UUID,  -- Replace with actual user_id
    'Basic',                     -- search term
    10,                          -- limit 10
    5                            -- offset 5
);

-- ============================================================================
-- TEST 11: Maximum Limit (100 items)
-- ============================================================================
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON)
SELECT * FROM get_user_mailroom_registrations(
    'YOUR_USER_ID_HERE'::UUID,  -- Replace with actual user_id
    NULL,
    100,                         -- limit 100
    0                            -- offset 0
);

-- ============================================================================
-- TEST 12: Search with no results
-- ============================================================================
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON)
SELECT * FROM get_user_mailroom_registrations(
    'YOUR_USER_ID_HERE'::UUID,  -- Replace with actual user_id
    'NonExistentLocation12345', -- search term that won't match
    NULL,
    0
);

-- ============================================================================
-- SUPPORTING DIAGNOSTIC QUERIES
-- ============================================================================

-- Check index usage statistics for mailroom registration tables
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan AS index_scans,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE tablename IN (
    'mailroom_registration_table',
    'mailroom_location_table',
    'mailroom_plan_table',
    'subscription_table',
    'mailbox_item_table',
    'users_table',
    'user_kyc_table'
)
ORDER BY idx_scan DESC, pg_relation_size(indexrelid) DESC;

-- Check table statistics
SELECT 
    schemaname,
    tablename,
    n_live_tup AS row_count,
    n_dead_tup AS dead_rows,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size
FROM pg_stat_user_tables
WHERE tablename IN (
    'mailroom_registration_table',
    'mailroom_location_table',
    'mailroom_plan_table',
    'subscription_table',
    'mailbox_item_table'
)
ORDER BY n_live_tup DESC;

-- Check index sizes and usage
SELECT
    t.tablename,
    i.indexname,
    pg_size_pretty(pg_relation_size(i.indexrelid)) AS index_size,
    s.idx_scan AS scans,
    s.idx_tup_read AS tuples_read,
    s.idx_tup_fetch AS tuples_fetched,
    CASE 
        WHEN s.idx_scan = 0 THEN 'UNUSED'
        WHEN s.idx_scan < 100 THEN 'LOW USAGE'
        WHEN s.idx_scan < 1000 THEN 'MODERATE USAGE'
        ELSE 'HIGH USAGE'
    END AS usage_status
FROM pg_indexes i
JOIN pg_stat_user_indexes s ON i.indexname = s.indexname AND i.tablename = s.tablename
JOIN pg_stat_user_tables t ON i.tablename = t.tablename
WHERE i.tablename IN (
    'mailroom_registration_table',
    'mailroom_location_table',
    'mailroom_plan_table',
    'subscription_table'
)
ORDER BY pg_relation_size(i.indexrelid) DESC, s.idx_scan DESC;

-- Check for missing indexes on foreign keys used in joins
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    CASE 
        WHEN EXISTS (
            SELECT 1
            FROM pg_indexes
            WHERE tablename = tc.table_name
            AND indexdef LIKE '%' || kcu.column_name || '%'
        ) THEN 'INDEXED'
        ELSE 'MISSING INDEX'
    END AS index_status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name IN (
        'mailroom_registration_table',
        'mailbox_item_table',
        'subscription_table'
    )
ORDER BY tc.table_name, kcu.column_name;

-- Check for sequential scans that could benefit from indexes
SELECT
    schemaname,
    tablename,
    seq_scan AS sequential_scans,
    seq_tup_read AS sequential_tuples_read,
    idx_scan AS index_scans,
    seq_tup_read / NULLIF(seq_scan, 0) AS avg_tuples_per_scan,
    CASE 
        WHEN seq_scan > 0 AND idx_scan = 0 THEN 'NEEDS INDEX'
        WHEN seq_scan > idx_scan * 10 THEN 'MAY NEED INDEX'
        ELSE 'OK'
    END AS recommendation
FROM pg_stat_user_tables
WHERE tablename IN (
    'mailroom_registration_table',
    'mailroom_location_table',
    'mailroom_plan_table',
    'subscription_table'
)
ORDER BY seq_tup_read DESC;

-- Analyze table statistics for query planner (update statistics)
ANALYZE mailroom_registration_table;
ANALYZE mailroom_location_table;
ANALYZE mailroom_plan_table;
ANALYZE subscription_table;
ANALYZE mailbox_item_table;

-- ============================================================================
-- PERFORMANCE METRICS TO CHECK
-- ============================================================================
-- For each EXPLAIN ANALYZE output, check:
-- 1. Execution Time: Should be < 200ms for most queries
-- 2. Planning Time: Should be < 50ms
-- 3. Index Usage: Verify indexes are being used (Index Scan vs Seq Scan)
-- 4. Buffer Hits: Higher buffer hit ratio = better performance (aim for > 95%)
-- 5. Rows Examined: Should be minimized with proper indexing
-- 6. Sort Operations: Ensure sorts are using indexes when possible
-- 7. Join Methods: Verify efficient join algorithms (Hash Join, Merge Join, Index Nested Loop)
-- 8. Filter Effectiveness: Check if WHERE clauses are applied early

-- ============================================================================
-- EXPECTED PERFORMANCE BENCHMARKS
-- ============================================================================
-- Small dataset (< 10 registrations):     < 50ms
-- Medium dataset (10-50 registrations):   < 100ms
-- Large dataset (50-200 registrations):   < 200ms
-- Very Large dataset (> 200 registrations): < 500ms
--
-- Search queries should add < 50ms overhead
-- Pagination should have minimal impact (< 20ms) regardless of offset
-- Combined search + pagination should be < 250ms total

-- ============================================================================
-- COMMON OPTIMIZATION STRATEGIES
-- ============================================================================
-- 1. If Sequential Scans appear: Check if indexes exist and are being used
--    - Verify index exists on user_id
--    - Verify trigram indexes exist for location_name and plan_name
--    - Check if statistics are up to date (run ANALYZE)
--
-- 2. If high buffer misses: 
--    - Increase shared_buffers or check cache hit ratio
--    - Consider increasing work_mem for complex queries
--
-- 3. If slow sorts: 
--    - Ensure created_at DESC index exists
--    - Verify composite index on (user_id, created_at DESC)
--
-- 4. If slow pagination with large offsets: 
--    - Consider cursor-based pagination for very large datasets
--    - Verify LIMIT/OFFSET is applied after filtering
--
-- 5. If slow LIKE searches: 
--    - Verify pg_trgm extension is enabled
--    - Check GIN trigram indexes are being used
--    - Consider full-text search for complex requirements
--
-- 6. If slow joins:
--    - Verify foreign key columns are indexed
--    - Check join order is optimal (smaller tables first)
--    - Consider denormalizing frequently joined data

-- ============================================================================
-- QUERY PLAN ANALYSIS CHECKLIST
-- ============================================================================
-- ✓ Does the query use Index Scan instead of Seq Scan?
-- ✓ Are trigram indexes (GIN) used for LIKE searches?
-- ✓ Is the (user_id, created_at DESC) composite index used?
-- ✓ Are joins using efficient algorithms (Index Nested Loop preferred)?
-- ✓ Is the total execution time within acceptable limits?
-- ✓ Is the buffer hit ratio > 95%?
-- ✓ Are filters applied early in the query plan?
-- ✓ Is pagination (LIMIT/OFFSET) applied after filtering?
