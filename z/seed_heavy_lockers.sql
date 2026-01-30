-- ============================================================================
-- Heavy Locker Seed (50,000 records)
-- Run this to test the performance of idx_location_locker_code_btree
-- ============================================================================

DO $$
DECLARE
  loc_id UUID;
  i INT;
  prefix TEXT;
BEGIN
  -- Create 10 Heavy Test Locations
  FOR i IN 1..10 LOOP
    INSERT INTO public.mailroom_location_table (
      mailroom_location_name,
      mailroom_location_total_lockers,
      mailroom_location_prefix
    ) VALUES (
      'Heavy Test Location ' || i,
      5000,
      'HTL' || i
    )
    RETURNING mailroom_location_id INTO loc_id;

    -- Seed 5,000 lockers for each location (Total 50,000)
    INSERT INTO public.location_locker_table (
      mailroom_location_id,
      location_locker_code,
      location_locker_is_available
    )
    SELECT 
      loc_id, 
      'L' || i || '-' || LPAD(series::text, 4, '0'), 
      true
    FROM generate_series(1, 5000) AS series;
  END LOOP;
  
  -- Update statistics
  ANALYZE public.location_locker_table;
END $$;
