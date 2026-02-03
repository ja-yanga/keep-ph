-- Performance Diagnostic Script for get_transactions RPC
-- This script runs EXPLAIN ANALYZE on the RPC function with various scenarios
-- to identify performance bottlenecks and optimize query execution

-- Prerequisites:
-- 1. Replace 'YOUR_USER_ID_HERE' with an actual user_id from your database
-- 2. Ensure you have test data with varying dataset sizes:
--    - Small: < 100 transactions
--    - Medium: 100-1000 transactions
--    - Large: 1000-10000 transactions
--    - Very Large: > 10000 transactions

-- Enable detailed timing and buffer usage tracking
SET track_io_timing = ON;

-- ============================================================================
-- TEST 1: Baseline - Admin view (all transactions, no filters)
-- ============================================================================
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM get_transactions(
    NULL,                        -- input_user_ids: NULL = admin view (all transactions)
    NULL,                        -- search_query: no search
    'payment_transaction_date',  -- sort_by: default
    'desc',                      -- sort_dir: default
    10,                          -- page_limit: 10
    0                            -- page_offset: 0
);

-- ============================================================================
-- TEST 2: Customer view - Single user (filtered by user_id)
-- ============================================================================
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM get_transactions(
    ARRAY['YOUR_USER_ID_HERE'::UUID],  -- Replace with actual user_id
    NULL,                               -- search_query: no search
    'payment_transaction_date',
    'desc',
    10,
    0
);

-- ============================================================================
-- TEST 3: Customer view - Multiple users (filtered by user_ids array)
-- ============================================================================
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM get_transactions(
    ARRAY['YOUR_USER_ID_HERE'::UUID, 'ANOTHER_USER_ID_HERE'::UUID],  -- Replace with actual user_ids
    NULL,
    'payment_transaction_date',
    'desc',
    10,
    0
);

-- ============================================================================
-- TEST 4: With Search Query - Reference ID
-- ============================================================================
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM get_transactions(
    NULL,                        -- admin view
    'REF123456',                 -- search_query: reference_id pattern
    'payment_transaction_date',
    'desc',
    10,
    0
);

-- ============================================================================
-- TEST 5: With Search Query - Order ID
-- ============================================================================
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM get_transactions(
    NULL,
    'ORD-2024-001',              -- search_query: order_id pattern
    'payment_transaction_date',
    'desc',
    10,
    0
);

-- ============================================================================
-- TEST 6: With Search Query - Partial match
-- ============================================================================
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM get_transactions(
    NULL,
    '2024',                      -- search_query: partial match
    'payment_transaction_date',
    'desc',
    10,
    0
);

-- ============================================================================
-- TEST 7: Sort by Created At (ASC)
-- ============================================================================
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM get_transactions(
    NULL,
    NULL,
    'payment_transaction_created_at',  -- sort_by: created_at
    'asc',                               -- sort_dir: ascending
    10,
    0
);

-- ============================================================================
-- TEST 8: Sort by Updated At (DESC)
-- ============================================================================
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM get_transactions(
    NULL,
    NULL,
    'payment_transaction_updated_at',    -- sort_by: updated_at
    'desc',
    10,
    0
);

-- ============================================================================
-- TEST 9: Pagination - First Page
-- ============================================================================
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM get_transactions(
    NULL,
    NULL,
    'payment_transaction_date',
    'desc',
    10,                          -- page_limit: 10
    0                            -- page_offset: 0
);

-- ============================================================================
-- TEST 10: Pagination - Second Page
-- ============================================================================
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM get_transactions(
    NULL,
    NULL,
    'payment_transaction_date',
    'desc',
    10,
    10                           -- page_offset: 10
);

-- ============================================================================
-- TEST 11: Pagination - Middle Page (offset 50)
-- ============================================================================
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM get_transactions(
    NULL,
    NULL,
    'payment_transaction_date',
    'desc',
    10,
    50                           -- page_offset: 50
);

-- ============================================================================
-- TEST 12: Pagination - Large Offset (offset 1000)
-- ============================================================================
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM get_transactions(
    NULL,
    NULL,
    'payment_transaction_date',
    'desc',
    10,
    1000                         -- page_offset: 1000
);

-- ============================================================================
-- TEST 13: Maximum Limit (100 items)
-- ============================================================================
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM get_transactions(
    NULL,
    NULL,
    'payment_transaction_date',
    'desc',
    100,                         -- page_limit: 100 (max allowed)
    0
);

-- ============================================================================
-- TEST 14: Combined - Search + Sort + Pagination (Admin view)
-- ============================================================================
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM get_transactions(
    NULL,
    'REF',                       -- search_query
    'payment_transaction_created_at',  -- sort_by
    'asc',                       -- sort_dir
    25,                          -- page_limit
    10                           -- page_offset
);

-- ============================================================================
-- TEST 15: Combined - User filter + Search + Pagination
-- ============================================================================
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM get_transactions(
    ARRAY['YOUR_USER_ID_HERE'::UUID],  -- Replace with actual user_id
    '2024',                      -- search_query
    'payment_transaction_date',
    'desc',
    20,
    0
);

-- ============================================================================
-- TEST 16: Search with no results
-- ============================================================================
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM get_transactions(
    NULL,
    'NonExistentReference12345', -- search_query that won't match
    'payment_transaction_date',
    'desc',
    10,
    0
);

-- ============================================================================
-- TEST 17: Customer view with search
-- ============================================================================
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM get_transactions(
    ARRAY['YOUR_USER_ID_HERE'::UUID],  -- Replace with actual user_id
    'ORD',                      -- search_query
    'payment_transaction_date',
    'desc',
    10,
    0
);

-- ============================================================================
-- SUPPORTING DIAGNOSTIC QUERIES
-- ============================================================================

-- Check index usage statistics for transaction-related tables
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
    'payment_transaction_table',
    'mailroom_registration_table',
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
    'payment_transaction_table',
    'mailroom_registration_table',
    'users_table',
    'user_kyc_table'
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
    'payment_transaction_table',
    'mailroom_registration_table',
    'users_table',
    'user_kyc_table'
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
        'payment_transaction_table',
        'mailroom_registration_table'
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
    'payment_transaction_table',
    'mailroom_registration_table',
    'users_table',
    'user_kyc_table'
)
ORDER BY seq_tup_read DESC;

-- Check existing indexes on payment_transaction_table
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename = 'payment_transaction_table'
ORDER BY indexname;

-- Check existing indexes on mailroom_registration_table
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename = 'mailroom_registration_table'
ORDER BY indexname;

-- Analyze table statistics for query planner (update statistics)
ANALYZE payment_transaction_table;
ANALYZE mailroom_registration_table;
ANALYZE users_table;
ANALYZE user_kyc_table;

-- RESET timing
SET track_io_timing = OFF;

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
-- 9. JSON Aggregation: Check if JSONB_AGG is efficient for large result sets

-- ============================================================================
-- EXPECTED PERFORMANCE BENCHMARKS
-- ============================================================================
-- Small dataset (< 100 transactions):     < 50ms
-- Medium dataset (100-1000 transactions):  < 100ms
-- Large dataset (1000-10000 transactions): < 200ms
-- Very Large dataset (> 10000 transactions): < 500ms
--
-- Search queries should add < 50ms overhead
-- Pagination should have minimal impact (< 30ms) for small offsets
-- Large offsets (1000+) may take longer due to OFFSET performance
-- Combined search + pagination should be < 250ms total
-- User filtering should add < 20ms overhead

-- ============================================================================
-- COMMON OPTIMIZATION STRATEGIES
-- ============================================================================
-- 1. If Sequential Scans appear: Check if indexes exist and are being used
--    - Verify index exists on mailroom_registration_id in payment_transaction_table
--    - Verify index exists on user_id in mailroom_registration_table
--    - Verify index exists on user_id in users_table
--    - Verify index exists on user_id in user_kyc_table
--    - Check if statistics are up to date (run ANALYZE)
--
-- 2. If high buffer misses: 
--    - Increase shared_buffers or check cache hit ratio
--    - Consider increasing work_mem for complex queries
--
-- 3. If slow sorts: 
--    - Ensure indexes exist on sort columns:
--      * payment_transaction_date
--      * payment_transaction_created_at
--      * payment_transaction_updated_at
--    - Consider composite indexes for common sort + filter combinations
--    - Verify sort direction matches index direction
--
-- 4. If slow pagination with large offsets: 
--    - Consider cursor-based pagination for very large datasets
--    - Verify LIMIT/OFFSET is applied after filtering
--    - Consider using WHERE clause with date ranges instead of OFFSET
--
-- 5. If slow ILIKE searches: 
--    - Verify indexes exist on search columns:
--      * payment_transaction_reference_id
--      * payment_transaction_reference
--      * payment_transaction_order_id
--    - Consider GIN trigram indexes for better ILIKE performance
--    - Consider full-text search for complex requirements
--
-- 6. If slow joins:
--    - Verify foreign key columns are indexed:
--      * payment_transaction_table.mailroom_registration_id
--      * mailroom_registration_table.user_id
--      * users_table.users_id (primary key, should be indexed)
--      * user_kyc_table.user_id
--    - Check join order is optimal (smaller tables first)
--    - Consider denormalizing frequently joined data
--
-- 7. If slow JSON aggregation:
--    - Verify JSONB_AGG is applied after pagination (not before)
--    - Consider reducing the number of fields in JSON response
--    - Check if JSONB_BUILD_OBJECT overhead is significant

-- ============================================================================
-- RECOMMENDED INDEXES
-- ============================================================================
-- Based on the get_transactions function, consider creating these indexes:
--
-- 1. Payment Transaction Table:
--    CREATE INDEX idx_payment_transaction_mailroom_registration_id 
--        ON payment_transaction_table(mailroom_registration_id);
--    CREATE INDEX idx_payment_transaction_date 
--        ON payment_transaction_table(payment_transaction_date DESC);
--    CREATE INDEX idx_payment_transaction_created_at 
--        ON payment_transaction_table(payment_transaction_created_at DESC);
--    CREATE INDEX idx_payment_transaction_updated_at 
--        ON payment_transaction_table(payment_transaction_updated_at DESC);
--    CREATE INDEX idx_payment_transaction_reference_id 
--        ON payment_transaction_table(payment_transaction_reference_id);
--    CREATE INDEX idx_payment_transaction_reference 
--        ON payment_transaction_table(payment_transaction_reference);
--    CREATE INDEX idx_payment_transaction_order_id 
--        ON payment_transaction_table(payment_transaction_order_id);
--
-- 2. Mailroom Registration Table:
--    CREATE INDEX idx_mailroom_registration_user_id 
--        ON mailroom_registration_table(user_id);
--
-- 3. Users Table:
--    (Primary key index should already exist on users_id)
--
-- 4. User KYC Table:
--    CREATE INDEX idx_user_kyc_user_id 
--        ON user_kyc_table(user_id);
--
-- 5. For better ILIKE search performance (optional):
--    CREATE EXTENSION IF NOT EXISTS pg_trgm;
--    CREATE INDEX idx_payment_transaction_reference_id_trgm 
--        ON payment_transaction_table USING GIN (payment_transaction_reference_id gin_trgm_ops);
--    CREATE INDEX idx_payment_transaction_reference_trgm 
--        ON payment_transaction_table USING GIN (payment_transaction_reference gin_trgm_ops);
--    CREATE INDEX idx_payment_transaction_order_id_trgm 
--        ON payment_transaction_table USING GIN (payment_transaction_order_id gin_trgm_ops);

-- ============================================================================
-- QUERY PLAN ANALYSIS CHECKLIST
-- ============================================================================
-- ✓ Does the query use Index Scan instead of Seq Scan?
-- ✓ Are indexes used for sorting operations?
-- ✓ Are foreign key joins using Index Nested Loop?
-- ✓ Is the total execution time within acceptable limits?
-- ✓ Is the buffer hit ratio > 95%?
-- ✓ Are filters applied early in the query plan?
-- ✓ Is pagination (LIMIT/OFFSET) applied after filtering?
-- ✓ Are ILIKE searches using indexes (or trigram indexes)?
-- ✓ Is JSON aggregation efficient (applied after pagination)?
-- ✓ Are user and KYC joins using efficient join methods?
