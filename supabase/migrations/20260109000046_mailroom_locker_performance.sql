-- Enable pg_trgm extension for fuzzy searching/pattern matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add GIN index for locker code searching to prevent sequential scans
-- This is critical for the search feature on 50,000+ records
CREATE INDEX IF NOT EXISTS idx_location_locker_code_trgm 
ON public.location_locker_table 
USING gin (location_locker_code gin_trgm_ops);

-- Add B-tree index for locker code sorting and exact matches
CREATE INDEX IF NOT EXISTS idx_location_locker_code_btree 
ON public.location_locker_table (location_locker_code ASC);

-- ADVANCED: Covering Index to allow "Index Only Scan" for the main list view
-- This includes the most commonly used columns in the index itself
CREATE INDEX IF NOT EXISTS idx_locker_list_covering 
ON public.location_locker_table (location_locker_code ASC) 
INCLUDE (location_locker_is_available, mailroom_location_id);

-- index for status filtering (Available vs Occupied tabs)
CREATE INDEX IF NOT EXISTS idx_locker_is_available 
ON public.location_locker_table (location_locker_is_available);

-- Add B-tree index for location name sorting
-- This eliminates the Sort step in the admin_list_mailroom_locations RPC
CREATE INDEX IF NOT EXISTS idx_mailroom_location_name_btree 
ON public.mailroom_location_table (mailroom_location_name ASC);

-- Add index for created_at to speed up the default ordering
CREATE INDEX IF NOT EXISTS idx_location_locker_created_at 
ON public.location_locker_table (location_locker_created_at DESC);

-- Prepare for clustering (physical reordering of rows on disk)
-- This makes sequential reads matching the index order much faster
-- Note: CLUSTER is a blocking operation, but great for heavy static data
-- CLUSTER public.location_locker_table USING idx_location_locker_code_btree;
