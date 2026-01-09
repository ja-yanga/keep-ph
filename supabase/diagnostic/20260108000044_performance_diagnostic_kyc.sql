-- KYC Performance Diagnostic Script (V2)
-- Run these queries one by one or all at once in the Supabase SQL Editor.

-- Enable detailed timing and buffer usage tracking
SET track_io_timing = ON;

-- 1. Analyze the main KYC listing RPC
-- Note: Replace 'a' with a search term that exists in your data for better results.
EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS) 
SELECT * FROM public.admin_list_user_kyc('a', 50, 0);

-- 2. Analyze the listing when scrolling (paged results)
EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS) 
SELECT * FROM public.admin_list_user_kyc('', 50, 100);

-- 3. Analyze the raw query (this identifies if the ILIKE or the JOIN is the issue)
-- This query mimics what's inside the admin_list_user_kyc function.
EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS)
SELECT uk.*, addr.*
FROM public.user_kyc_table uk
LEFT JOIN LATERAL (
  SELECT * FROM public.user_kyc_address_table a
  WHERE a.user_kyc_id = uk.user_kyc_id
  ORDER BY a.user_kyc_address_created_at DESC
  LIMIT 1
) addr ON TRUE
WHERE uk.user_kyc_first_name ILIKE '%a%' OR uk.user_kyc_last_name ILIKE '%a%'
ORDER BY uk.user_kyc_submitted_at DESC NULLS LAST
LIMIT 50;

-- 4. Check for existing indexes (Run this to see what you already have)
SELECT
    indexname,
    indexdef
FROM
    pg_indexes
WHERE
    schemaname = 'public'
    AND tablename IN ('user_kyc_table', 'user_kyc_address_table');

-- RESET timing
SET track_io_timing = OFF;

/*
HOW TO INTERPRET RESULTS:
1. Execution Time: Look for high values here. Anything over 100ms for a simple list is slow.
2. Sequential Scan: If you see "Seq Scan" on user_kyc_table or user_kyc_address_table, an index is missing or not being used.
3. Filter with ILIKE: This usually causes Seq Scans. If performance is poor, consider a GIN index on first_name/last_name.
4. Buffers: "shared read" indicates it's hitting the disk instead of RAM (cache).
*/
