-- Improvements for Mailroom Locations Performance
-- This file adds indexes for fuzzy search and efficient filtering

-- 1. Enable pg_trgm for fuzzy search if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. GIN Index for Name fuzzy search
CREATE INDEX IF NOT EXISTS idx_mailroom_location_name_trgm 
ON public.mailroom_location_table 
USING gin (mailroom_location_name gin_trgm_ops);

-- 3. GIN Index for Prefix (Code) fuzzy search
CREATE INDEX IF NOT EXISTS idx_mailroom_location_prefix_trgm 
ON public.mailroom_location_table 
USING gin (mailroom_location_prefix gin_trgm_ops);

-- 4. B-tree Indexes for filtering and sorting
CREATE INDEX IF NOT EXISTS idx_mailroom_location_name_btree 
ON public.mailroom_location_table (mailroom_location_name ASC);

CREATE INDEX IF NOT EXISTS idx_mailroom_location_region_btree 
ON public.mailroom_location_table (mailroom_location_region);

CREATE INDEX IF NOT EXISTS idx_mailroom_location_city_btree 
ON public.mailroom_location_table (mailroom_location_city);

-- 5. B-tree Index for Total Lockers (Sorting)
CREATE INDEX IF NOT EXISTS idx_location_total_lockers_btree 
ON public.mailroom_location_table (mailroom_location_total_lockers DESC);

-- 6. ANALYZE to update statistics so the planner can make better decisions
ANALYZE public.mailroom_location_table;
