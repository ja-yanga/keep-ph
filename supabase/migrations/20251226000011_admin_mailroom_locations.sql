-- RPC to list all mailroom locations for admin views
-- CREATE OR REPLACE FUNCTION public.admin_list_mailroom_locations()
-- RETURNS JSON
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path TO ''
-- AS $$
-- DECLARE
--   return_data JSON := '[]'::JSON;
-- BEGIN
--   SELECT COALESCE(
--     JSON_AGG(
--       JSON_BUILD_OBJECT(
--         'mailroom_location_id', mailroom_location_id,
--         'mailroom_location_name', mailroom_location_name,
--         'mailroom_location_region', mailroom_location_region,
--         'mailroom_location_city', mailroom_location_city,
--         'mailroom_location_barangay', mailroom_location_barangay,
--         'mailroom_location_zip', mailroom_location_zip,
--         'mailroom_location_total_lockers', mailroom_location_total_lockers,
--         'mailroom_location_prefix', mailroom_location_prefix
--       )
--       ORDER BY mailroom_location_name ASC
--     ),
--     '[]'::JSON
--   )
--   INTO  return_data
--   FROM public.mailroom_location_table;

--   RETURN  return_data;
-- END;
-- $$;

-- RPC to create a mailroom location and seed lockers
CREATE OR REPLACE FUNCTION public.admin_create_mailroom_location(
  input_name TEXT,
  input_code TEXT DEFAULT NULL,
  input_region TEXT DEFAULT NULL,
  input_city TEXT DEFAULT NULL,
  input_barangay TEXT DEFAULT NULL,
  input_zip TEXT DEFAULT NULL,
  input_total_lockers INTEGER DEFAULT 0
)
RETURNS public.mailroom_location_table
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  new_location public.mailroom_location_table%ROWTYPE;
  locker_prefix TEXT;
  total_lockers INTEGER := COALESCE(input_total_lockers, 0);
BEGIN
  IF COALESCE(TRIM(input_name), '') = '' THEN
    RAISE EXCEPTION 'mailroom location name is required';
  END IF;

  INSERT INTO public.mailroom_location_table (
    mailroom_location_name,
    mailroom_location_prefix,
    mailroom_location_region,
    mailroom_location_city,
    mailroom_location_barangay,
    mailroom_location_zip,
    mailroom_location_total_lockers
  )
  VALUES (
    TRIM(input_name),
    NULLIF(TRIM(input_code), ''),
    NULLIF(TRIM(input_region), ''),
    NULLIF(TRIM(input_city), ''),
    NULLIF(TRIM(input_barangay), ''),
    NULLIF(TRIM(input_zip), ''),
    total_lockers
  )
  RETURNING * INTO new_location;

  locker_prefix :=
    COALESCE(new_location.mailroom_location_prefix, 'L');

  IF total_lockers > 0 THEN
    INSERT INTO public.location_locker_table (
      mailroom_location_id,
      location_locker_code,
      location_locker_is_available
    )
    SELECT
      new_location.mailroom_location_id,
      FORMAT('%s-%s', locker_prefix, seq),
      true
    FROM generate_series(1, total_lockers) AS seq;
  END IF;

  RETURN new_location;
END;
$$;