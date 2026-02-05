-- RPC for listing lockers with sorting and filtering
CREATE OR REPLACE FUNCTION public.admin_list_lockers(
  input_search TEXT DEFAULT '',
  input_location_id UUID DEFAULT NULL,
  input_active_tab TEXT DEFAULT 'all',
  input_limit INTEGER DEFAULT 10,
  input_offset INTEGER DEFAULT 0,
  input_sort_by TEXT DEFAULT 'locker_code',
  input_sort_order TEXT DEFAULT 'ASC'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  sanitized_limit INTEGER := LEAST(GREATEST(COALESCE(input_limit, 1), 1), 100);
  sanitized_offset INTEGER := GREATEST(COALESCE(input_offset, 0), 0);
  search_term TEXT := COALESCE(input_search, '');
  sort_by_term TEXT := COALESCE(input_sort_by, 'locker_code');
  sort_order_term TEXT := UPPER(COALESCE(input_sort_order, 'ASC'));
  total_count INTEGER;
  return_data JSON := '[]'::JSON;
BEGIN
  -- Total count query
  SELECT COUNT(*)
  INTO total_count
  FROM public.location_locker_table ll
  LEFT JOIN public.mailroom_location_table ml ON ll.mailroom_location_id = ml.mailroom_location_id
  WHERE ll.location_locker_deleted_at IS NULL
    AND (
      search_term = '' 
      OR ll.location_locker_code ILIKE '%' || search_term || '%'
      OR ml.mailroom_location_name ILIKE '%' || search_term || '%'
    )
    AND (input_location_id IS NULL OR ll.mailroom_location_id = input_location_id)
    AND (
      input_active_tab = 'all'
      OR (input_active_tab = 'occupied' AND ll.location_locker_is_available = false)
      OR (input_active_tab = 'available' AND ll.location_locker_is_available = true)
    );

  WITH base AS (
    SELECT
      ll.location_locker_id,
      ll.mailroom_location_id,
      ll.location_locker_code,
      ll.location_locker_is_available,
      ll.location_locker_is_assignable,
      ll.location_locker_created_at,
      ml.mailroom_location_name,
      al.mailroom_assigned_locker_id,
      al.mailroom_registration_id,
      al.mailroom_assigned_locker_status
    FROM public.location_locker_table ll
    LEFT JOIN public.mailroom_location_table ml ON ll.mailroom_location_id = ml.mailroom_location_id
    LEFT JOIN public.mailroom_assigned_locker_table al ON ll.location_locker_id = al.location_locker_id
    WHERE ll.location_locker_deleted_at IS NULL
      AND (
        search_term = '' 
        OR ll.location_locker_code ILIKE '%' || search_term || '%'
        OR ml.mailroom_location_name ILIKE '%' || search_term || '%'
      )
      AND (input_location_id IS NULL OR ll.mailroom_location_id = input_location_id)
      AND (
        input_active_tab = 'all'
        OR (input_active_tab = 'occupied' AND ll.location_locker_is_available = false)
        OR (input_active_tab = 'available' AND ll.location_locker_is_available = true)
      )
    ORDER BY
      -- String Sorting
      CASE WHEN sort_order_term = 'ASC' THEN
        CASE
          WHEN sort_by_term = 'locker_code' OR sort_by_term = 'location_locker_code' THEN ll.location_locker_code
          WHEN sort_by_term = 'location.name' OR sort_by_term = 'location_name' OR sort_by_term = 'mailroom_location_name' THEN ml.mailroom_location_name
          WHEN sort_by_term = 'capacity' OR sort_by_term = 'mailroom_assigned_locker_status' THEN al.mailroom_assigned_locker_status::text
          ELSE NULL
        END
      END ASC,
      CASE WHEN sort_order_term = 'DESC' THEN
        CASE
          WHEN sort_by_term = 'locker_code' OR sort_by_term = 'location_locker_code' THEN ll.location_locker_code
          WHEN sort_by_term = 'location.name' OR sort_by_term = 'location_name' OR sort_by_term = 'mailroom_location_name' THEN ml.mailroom_location_name
          WHEN sort_by_term = 'capacity' OR sort_by_term = 'mailroom_assigned_locker_status' THEN al.mailroom_assigned_locker_status::text
          ELSE NULL
        END
      END DESC,
      -- Boolean / Other Sorting
      CASE WHEN sort_order_term = 'ASC' THEN
        CASE
          WHEN sort_by_term = 'is_available' OR sort_by_term = 'location_locker_is_available' THEN ll.location_locker_is_available::int::text
          WHEN sort_by_term = 'is_assignable' OR sort_by_term = 'location_locker_is_assignable' THEN ll.location_locker_is_assignable::int::text
          ELSE NULL
        END
      END ASC,
      CASE WHEN sort_order_term = 'DESC' THEN
        CASE
          WHEN sort_by_term = 'is_available' OR sort_by_term = 'location_locker_is_available' THEN ll.location_locker_is_available::int::text
          WHEN sort_by_term = 'is_assignable' OR sort_by_term = 'location_locker_is_assignable' THEN ll.location_locker_is_assignable::int::text
          ELSE NULL
        END
      END DESC,
      -- Timestamp Sorting
      CASE WHEN sort_order_term = 'ASC' THEN
        CASE
          WHEN sort_by_term = 'created_at' OR sort_by_term = 'location_locker_created_at' THEN ll.location_locker_created_at::text
          ELSE NULL
        END
      END ASC,
      CASE WHEN sort_order_term = 'DESC' THEN
        CASE
          WHEN sort_by_term = 'created_at' OR sort_by_term = 'location_locker_created_at' THEN ll.location_locker_created_at::text
          ELSE NULL
        END
      END DESC,
      -- Default Fallback
      ll.location_locker_code ASC
    LIMIT sanitized_limit
    OFFSET sanitized_offset
  )
  SELECT JSON_BUILD_OBJECT(
    'data', COALESCE((SELECT JSON_AGG(base) FROM base), '[]'::JSON),
    'total_count', COALESCE(total_count, 0)
  )
  INTO return_data;

  RETURN return_data;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.admin_list_lockers(TEXT, UUID, TEXT, INTEGER, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_lockers(TEXT, UUID, TEXT, INTEGER, INTEGER, TEXT, TEXT) TO service_role;
