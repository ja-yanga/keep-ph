-- UNIFIED PERFORMANCE OPTIMIZATION: Mailroom Locations
-- 1. Optimized RPC replacing the slow JSON aggregation
-- 2. Proper Indexing for scaling

-- Enable pg_trgm for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Drop the old slow function if exists (optional but recommended to avoid confusion)
-- DROP FUNCTION IF EXISTS public.admin_list_mailroom_locations();

-- NEW: High-performance Paginated RPC
CREATE OR REPLACE FUNCTION public.rpc_list_mailroom_locations_paginated(
    p_search TEXT DEFAULT '',
    p_region TEXT DEFAULT '',
    p_city TEXT DEFAULT '',
    p_sort_by TEXT DEFAULT 'name_asc',
    p_limit INT DEFAULT 10,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    code TEXT,
    region TEXT,
    city TEXT,
    barangay TEXT,
    zip TEXT,
    is_hidden BOOLEAN,
    max_locker_limit INT,
    total_lockers INT,
    total_count BIGINT
) 
LANGUAGE sql -- SQL functions are generally faster and more optimizable than PL/pgSQL for simple SELECTs
STABLE
PARALLEL SAFE
SECURITY DEFINER
SET search_path TO ''
AS $$
    SELECT 
        l.mailroom_location_id,
        l.mailroom_location_name,
        l.mailroom_location_prefix,
        l.mailroom_location_region,
        l.mailroom_location_city,
        l.mailroom_location_barangay,
        l.mailroom_location_zip,
        l.mailroom_location_is_hidden,
        l.mailroom_location_max_locker_limit,
        l.mailroom_location_total_lockers,
        COUNT(*) OVER()
    FROM public.mailroom_location_table l
    WHERE (p_search = '' OR l.mailroom_location_name ILIKE '%' || p_search || '%' OR l.mailroom_location_prefix ILIKE '%' || p_search || '%')
      AND (p_region = '' OR l.mailroom_location_region = p_region)
      AND (p_city = '' OR l.mailroom_location_city = p_city)
    ORDER BY 
        CASE WHEN p_sort_by = 'name_asc' THEN l.mailroom_location_name END ASC,
        CASE WHEN p_sort_by = 'name_desc' THEN l.mailroom_location_name END DESC,
        CASE WHEN p_sort_by = 'lockers_desc' THEN l.mailroom_location_total_lockers END DESC,
        CASE WHEN p_sort_by = 'lockers_asc' THEN l.mailroom_location_total_lockers END ASC,
        l.mailroom_location_name ASC
    LIMIT p_limit
    OFFSET p_offset;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION public.rpc_list_mailroom_locations_paginated TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_list_mailroom_locations_paginated TO service_role;

-- Ensure GIN indexes are present for fuzzy search performance scaling
CREATE INDEX IF NOT EXISTS idx_location_name_trgm ON public.mailroom_location_table USING gin (mailroom_location_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_location_prefix_trgm ON public.mailroom_location_table USING gin (mailroom_location_prefix gin_trgm_ops);

-- B-tree indexes for fast filtering and sorting
CREATE INDEX IF NOT EXISTS idx_location_region_city ON public.mailroom_location_table (mailroom_location_region, mailroom_location_city);
CREATE INDEX IF NOT EXISTS idx_location_total_lockers ON public.mailroom_location_table (mailroom_location_total_lockers DESC);

ANALYZE public.mailroom_location_table;
