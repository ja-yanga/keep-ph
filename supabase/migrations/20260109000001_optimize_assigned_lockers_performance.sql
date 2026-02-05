-- ============================================================================
-- Optimize Assigned Lockers Performance
-- ============================================================================
-- This migration adds missing indexes and optimizes the RPC function
-- to handle large datasets (30,000+ assigned lockers) efficiently
-- ============================================================================

-- Add missing indexes on mailroom_assigned_locker_table for performance
CREATE INDEX IF NOT EXISTS idx_mailroom_assigned_locker_registration_id 
  ON mailroom_assigned_locker_table(mailroom_registration_id);

CREATE INDEX IF NOT EXISTS idx_mailroom_assigned_locker_location_locker_id 
  ON mailroom_assigned_locker_table(location_locker_id);

CREATE INDEX IF NOT EXISTS idx_mailroom_assigned_locker_status 
  ON mailroom_assigned_locker_table(mailroom_assigned_locker_status);

-- Optimize the admin_get_assigned_lockers RPC function
-- Use more efficient query with proper index usage
CREATE OR REPLACE FUNCTION admin_get_assigned_lockers()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    return_data JSONB;
BEGIN
    -- Use a more efficient query that leverages indexes
    -- Only select necessary columns and use INNER JOINs for better performance
    -- Filter out deleted lockers
    SELECT JSONB_AGG(
        JSONB_BUILD_OBJECT(
            'id', malt.mailroom_assigned_locker_id::text,
            'registration_id', malt.mailroom_registration_id::text,
            'locker_id', malt.location_locker_id::text,
            'status', malt.mailroom_assigned_locker_status,
            'assigned_at', malt.mailroom_assigned_locker_assigned_at,
            'registration', JSONB_BUILD_OBJECT(
                'id', mrt.mailroom_registration_id::text,
                'user_id', mrt.user_id::text,
                'email', ut.users_email
            ),
            'locker', JSONB_BUILD_OBJECT(
                'id', llt.location_locker_id::text,
                'code', llt.location_locker_code,
                'is_available', llt.location_locker_is_available
            )
        )
        ORDER BY malt.mailroom_assigned_locker_assigned_at DESC
    ) INTO return_data
    FROM mailroom_assigned_locker_table malt
    INNER JOIN mailroom_registration_table mrt 
        ON malt.mailroom_registration_id = mrt.mailroom_registration_id
    INNER JOIN users_table ut 
        ON mrt.user_id = ut.users_id
    INNER JOIN location_locker_table llt 
        ON malt.location_locker_id = llt.location_locker_id
    WHERE llt.location_locker_deleted_at IS NULL; -- Exclude deleted lockers

    RETURN COALESCE(return_data, '[]'::JSONB);
END;
$$;

-- Also optimize the get_admin_mailroom_packages function to ensure assigned lockers are returned as strings
-- This ensures UUID comparison works correctly in the frontend

-- Drop existing functions to avoid overloading issues
DROP FUNCTION IF EXISTS public.get_admin_mailroom_packages(integer, integer, boolean);
DROP FUNCTION IF EXISTS public.get_admin_mailroom_packages(integer, integer, boolean, text[]);
DROP FUNCTION IF EXISTS public.get_admin_mailroom_packages(integer, integer, boolean, text[], text, text);
DROP FUNCTION IF EXISTS public.get_admin_mailroom_packages(integer, integer, boolean, text[], text, text, text, text);

CREATE OR REPLACE FUNCTION public.get_admin_mailroom_packages(
  input_limit INTEGER DEFAULT 50,
  input_offset INTEGER DEFAULT 0,
  input_compact BOOLEAN DEFAULT false,
  input_status TEXT[] DEFAULT NULL,
  input_sort_by TEXT DEFAULT 'received_at',
  input_sort_order TEXT DEFAULT 'DESC',
  input_search TEXT DEFAULT NULL,
  input_type TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  result JSON;
  packages_json JSON;
  registrations_json JSON;
  lockers_json JSON;
  assigned_lockers_json JSON;
  total_count INTEGER;
  counts_json JSON;
  search_query TEXT;
BEGIN
  -- Prepare search query
  IF input_search IS NOT NULL AND input_search != '' THEN
    search_query := '%' || LOWER(input_search) || '%';
  ELSE
    search_query := NULL;
  END IF;

  -- Get tab counts (excluding soft-deleted)
  SELECT JSON_BUILD_OBJECT(
    'active', COUNT(*) FILTER (WHERE mailbox_item_status::TEXT = 'STORED'),
    'requests', COUNT(*) FILTER (WHERE mailbox_item_status::TEXT LIKE 'REQUEST%'),
    'released', COUNT(*) FILTER (WHERE mailbox_item_status::TEXT IN ('RELEASED', 'RETRIEVED')),
    'disposed', COUNT(*) FILTER (WHERE mailbox_item_status::TEXT = 'DISPOSED')
  ) INTO counts_json
  FROM public.mailbox_item_table
  WHERE mailbox_item_deleted_at IS NULL;

  -- Get packages (mailbox items) with pagination and filtering
  WITH filtered_items AS (
    SELECT 
      mi.mailbox_item_id,
      mi.mailbox_item_name,
      mi.mailroom_registration_id,
      mi.location_locker_id,
      mi.mailbox_item_type,
      mi.mailbox_item_status,
      mi.mailbox_item_photo,
      mi.mailbox_item_release_address,
      mi.user_address_id,
      mi.mailbox_item_received_at,
      mi.mailbox_item_created_at,
      mi.mailbox_item_updated_at,
      mr.mailroom_registration_id AS reg_id,
      mr.mailroom_registration_code,
      ll.location_locker_id AS locker_id,
      ll.location_locker_code,
      u.users_email,
      u.mobile_number,
      uk.user_kyc_first_name,
      uk.user_kyc_last_name,
      ml.mailroom_location_name,
      p.mailroom_plan_id,
      p.mailroom_plan_name,
      p.mailroom_plan_can_receive_mail,
      p.mailroom_plan_can_receive_parcels
    FROM public.mailbox_item_table mi
    LEFT JOIN public.mailroom_registration_table mr ON mr.mailroom_registration_id = mi.mailroom_registration_id
    LEFT JOIN public.location_locker_table ll ON ll.location_locker_id = mi.location_locker_id
    LEFT JOIN public.users_table u ON u.users_id = mr.user_id
    LEFT JOIN public.user_kyc_table uk ON uk.user_id = u.users_id
    LEFT JOIN public.mailroom_location_table ml ON ml.mailroom_location_id = mr.mailroom_location_id
    LEFT JOIN public.mailroom_plan_table p ON p.mailroom_plan_id = mr.mailroom_plan_id
    WHERE mi.mailbox_item_deleted_at IS NULL
      AND (input_status IS NULL OR mi.mailbox_item_status::TEXT = ANY(input_status))
      AND (input_type IS NULL OR mi.mailbox_item_type::TEXT = input_type)
      AND (
        search_query IS NULL OR 
        LOWER(mi.mailbox_item_name) LIKE search_query OR
        LOWER(COALESCE(uk.user_kyc_first_name, '') || ' ' || COALESCE(uk.user_kyc_last_name, '')) LIKE search_query OR
        LOWER(u.users_email) LIKE search_query OR
        LOWER(ll.location_locker_code) LIKE search_query OR
        LOWER(mi.mailbox_item_status::TEXT) LIKE search_query
      )
  ),
  paginated_items AS (
    SELECT * FROM filtered_items
    ORDER BY
      CASE WHEN input_sort_by = 'received_at' AND input_sort_order = 'ASC' THEN mailbox_item_received_at END ASC NULLS LAST,
      CASE WHEN input_sort_by = 'received_at' AND input_sort_order = 'DESC' THEN mailbox_item_received_at END DESC NULLS LAST,
      CASE WHEN input_sort_by = 'package_name' AND input_sort_order = 'ASC' THEN mailbox_item_name END ASC NULLS LAST,
      CASE WHEN input_sort_by = 'package_name' AND input_sort_order = 'DESC' THEN mailbox_item_name END DESC NULLS LAST,
      CASE WHEN input_sort_by = 'registration.full_name' AND input_sort_order = 'ASC' THEN COALESCE(user_kyc_first_name, '') || ' ' || COALESCE(user_kyc_last_name, '') END ASC NULLS LAST,
      CASE WHEN input_sort_by = 'registration.full_name' AND input_sort_order = 'DESC' THEN COALESCE(user_kyc_first_name, '') || ' ' || COALESCE(user_kyc_last_name, '') END DESC NULLS LAST,
      CASE WHEN input_sort_by = 'locker.locker_code' AND input_sort_order = 'ASC' THEN location_locker_code END ASC NULLS LAST,
      CASE WHEN input_sort_by = 'locker.locker_code' AND input_sort_order = 'DESC' THEN location_locker_code END DESC NULLS LAST,
      CASE WHEN input_sort_by = 'package_type' AND input_sort_order = 'ASC' THEN mailbox_item_type END ASC NULLS LAST,
      CASE WHEN input_sort_by = 'package_type' AND input_sort_order = 'DESC' THEN mailbox_item_type END DESC NULLS LAST,
      CASE WHEN input_sort_by = 'status' AND input_sort_order = 'ASC' THEN mailbox_item_status END ASC NULLS LAST,
      CASE WHEN input_sort_by = 'status' AND input_sort_order = 'DESC' THEN mailbox_item_status END DESC NULLS LAST
    LIMIT input_limit
    OFFSET input_offset
  )
  SELECT 
    (SELECT COUNT(*) FROM filtered_items),
    COALESCE(
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'id', pi.mailbox_item_id,
          'package_name', pi.mailbox_item_name,
          'registration_id', pi.mailroom_registration_id,
          'locker_id', pi.location_locker_id,
          'package_type', pi.mailbox_item_type,
          'status', pi.mailbox_item_status,
          'package_photo', pi.mailbox_item_photo,
          'release_address', pi.mailbox_item_release_address,
          'release_address_id', pi.user_address_id,
          'received_at', pi.mailbox_item_received_at,
          'mailbox_item_created_at', pi.mailbox_item_created_at,
          'mailbox_item_updated_at', pi.mailbox_item_updated_at,
          'mailroom_file_table', (
            SELECT JSON_AGG(ROW_TO_JSON(mft))
            FROM public.mailroom_file_table mft
            WHERE mft.mailbox_item_id = pi.mailbox_item_id
          ),
          'registration', CASE
            WHEN pi.reg_id IS NOT NULL THEN JSON_BUILD_OBJECT(
              'id', pi.reg_id,
              'full_name', COALESCE(
                CONCAT_WS(' ', pi.user_kyc_first_name, pi.user_kyc_last_name),
                pi.mailroom_location_name,
                'Unknown'
              ),
              'email', pi.users_email,
              'mobile', pi.mobile_number,
              'mailroom_code', pi.mailroom_registration_code,
              'mailroom_plans', CASE
                WHEN pi.mailroom_plan_id IS NOT NULL THEN JSON_BUILD_OBJECT(
                  'name', pi.mailroom_plan_name,
                  'can_receive_mail', pi.mailroom_plan_can_receive_mail,
                  'can_receive_parcels', pi.mailroom_plan_can_receive_parcels
                )
                ELSE NULL
              END
            )
            ELSE NULL
          END,
          'locker', CASE
            WHEN pi.locker_id IS NOT NULL THEN JSON_BUILD_OBJECT(
              'id', pi.locker_id,
              'locker_code', pi.location_locker_code
            )
            ELSE NULL
          END
        )
      ),
      '[]'::JSON
    )
  INTO total_count, packages_json
  FROM paginated_items pi;

  -- Get registrations
  SELECT COALESCE(
    JSON_AGG(
      JSON_BUILD_OBJECT(
        'id', mr.mailroom_registration_id,
        'full_name', COALESCE(
          CONCAT_WS(' ', uk.user_kyc_first_name, uk.user_kyc_last_name),
          ml.mailroom_location_name,
          'Unknown'
        ),
        'email', u.users_email,
        'mobile', u.mobile_number,
        'mailroom_code', mr.mailroom_registration_code,
        'mailroom_plans', CASE
          WHEN p.mailroom_plan_id IS NOT NULL THEN JSON_BUILD_OBJECT(
            'name', p.mailroom_plan_name,
            'can_receive_mail', p.mailroom_plan_can_receive_mail,
            'can_receive_parcels', p.mailroom_plan_can_receive_parcels
          )
          ELSE NULL
        END
      )
    ),
    '[]'::JSON
  )
  INTO registrations_json
  FROM public.mailroom_registration_table mr
  LEFT JOIN public.users_table u ON u.users_id = mr.user_id
  LEFT JOIN public.user_kyc_table uk ON uk.user_id = u.users_id
  LEFT JOIN public.mailroom_location_table ml ON ml.mailroom_location_id = mr.mailroom_location_id
  LEFT JOIN public.mailroom_plan_table p ON p.mailroom_plan_id = mr.mailroom_plan_id;

  -- Get lockers (only non-deleted)
  SELECT COALESCE(
    JSON_AGG(
      JSON_BUILD_OBJECT(
        'id', ll.location_locker_id,
        'locker_code', ll.location_locker_code,
        'is_available', ll.location_locker_is_available
      )
    ),
    '[]'::JSON
  )
  INTO lockers_json
  FROM public.location_locker_table ll
  WHERE ll.location_locker_deleted_at IS NULL;

  -- Get assigned lockers
  SELECT COALESCE(
    JSON_AGG(
      JSON_BUILD_OBJECT(
        'id', mal.mailroom_assigned_locker_id::text,
        'registration_id', mal.mailroom_registration_id::text,
        'locker_id', mal.location_locker_id::text,
        'status', mal.mailroom_assigned_locker_status,
        'locker', CASE
          WHEN ll.location_locker_id IS NOT NULL THEN JSON_BUILD_OBJECT(
            'id', ll.location_locker_id::text,
            'locker_code', ll.location_locker_code
          )
          ELSE NULL
        END
      )
    ),
    '[]'::JSON
  )
  INTO assigned_lockers_json
  FROM public.mailroom_assigned_locker_table mal
  LEFT JOIN public.location_locker_table ll ON ll.location_locker_id = mal.location_locker_id
  WHERE ll.location_locker_deleted_at IS NULL;

  -- Build final result
  result := JSON_BUILD_OBJECT(
    'packages', packages_json,
    'registrations', registrations_json,
    'lockers', lockers_json,
    'assignedLockers', assigned_lockers_json,
    'total_count', COALESCE(total_count, 0),
    'counts', counts_json
  );

  RETURN result;
END;
$$;

-- Add comment explaining the optimization
COMMENT ON FUNCTION admin_get_assigned_lockers() IS 
'Optimized RPC function to fetch all assigned lockers with related data. 
Uses indexes on mailroom_assigned_locker_table for efficient querying with large datasets.';
