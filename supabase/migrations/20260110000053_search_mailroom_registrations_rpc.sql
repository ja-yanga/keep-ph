-- RPC Function: Search Mailroom Registrations
-- Efficiently searches registrations by email, name, or mailroom code
-- Uses database-level filtering for better performance with large datasets

CREATE OR REPLACE FUNCTION public.search_mailroom_registrations(
  search_query TEXT DEFAULT '',
  result_limit INTEGER DEFAULT 50
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  result JSON;
  search_pattern TEXT;
BEGIN
  -- Validate limit (increased for better search coverage)
  IF result_limit > 500 THEN
    result_limit := 500;
  END IF;
  
  IF result_limit < 1 THEN
    result_limit := 50;
  END IF;

  -- Build search pattern for ILIKE (case-insensitive)
  IF search_query IS NULL OR LENGTH(TRIM(search_query)) = 0 THEN
    search_pattern := '%';
  ELSE
    search_pattern := '%' || TRIM(search_query) || '%';
  END IF;

  -- Search registrations with joined user data
  -- This query searches across email, name, and mailroom code at the database level
  WITH ranked_results AS (
    SELECT 
      r.mailroom_registration_id,
      COALESCE(
        TRIM(uk.user_kyc_first_name || ' ' || uk.user_kyc_last_name),
        u.users_email,
        'Unknown'
      ) as full_name,
      u.users_email,
      u.mobile_number,
      r.mailroom_registration_code,
      p.mailroom_plan_name,
      p.mailroom_plan_can_receive_mail,
      p.mailroom_plan_can_receive_parcels,
      r.mailroom_registration_created_at,
      -- Prioritize exact matches
      CASE 
        WHEN r.mailroom_registration_code ILIKE search_pattern THEN 1
        WHEN u.users_email ILIKE search_pattern THEN 2
        WHEN (uk.user_kyc_first_name || ' ' || uk.user_kyc_last_name) ILIKE search_pattern THEN 3
        ELSE 4
      END as match_priority
    FROM public.mailroom_registration_table r
    INNER JOIN public.users_table u ON r.user_id = u.users_id
    LEFT JOIN public.user_kyc_table uk ON u.users_id = uk.user_id
    LEFT JOIN public.mailroom_plan_table p ON r.mailroom_plan_id = p.mailroom_plan_id
    WHERE 
      -- Search across multiple fields (handle NULLs properly)
      (
        (r.mailroom_registration_code IS NOT NULL AND r.mailroom_registration_code ILIKE search_pattern)
        OR (u.users_email IS NOT NULL AND u.users_email ILIKE search_pattern)
        OR (uk.user_kyc_first_name IS NOT NULL AND uk.user_kyc_first_name ILIKE search_pattern)
        OR (uk.user_kyc_last_name IS NOT NULL AND uk.user_kyc_last_name ILIKE search_pattern)
        OR (
          uk.user_kyc_first_name IS NOT NULL 
          AND uk.user_kyc_last_name IS NOT NULL 
          AND (uk.user_kyc_first_name || ' ' || uk.user_kyc_last_name) ILIKE search_pattern
        )
      )
      OR (search_query IS NULL OR LENGTH(TRIM(search_query)) = 0) -- Return all if no search
    ORDER BY match_priority, r.mailroom_registration_created_at DESC
    LIMIT result_limit
  )
  SELECT COALESCE(
    JSON_AGG(
      JSON_BUILD_OBJECT(
        'mailroom_registration_id', mailroom_registration_id,
        'full_name', full_name,
        'users_email', users_email,
        'mobile_number', mobile_number,
        'mailroom_registration_code', mailroom_registration_code,
        'mailroom_plans', CASE
          WHEN mailroom_plan_name IS NOT NULL THEN JSON_BUILD_OBJECT(
            'mailroom_plan_name', mailroom_plan_name,
            'mailroom_plan_can_receive_mail', mailroom_plan_can_receive_mail,
            'mailroom_plan_can_receive_parcels', mailroom_plan_can_receive_parcels
          )
          ELSE NULL
        END
      )
    ),
    '[]'::JSON
  )
  INTO result
  FROM ranked_results;

  RETURN COALESCE(result, '[]'::JSON);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.search_mailroom_registrations(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_mailroom_registrations(TEXT, INTEGER) TO service_role;

-- Add comment
COMMENT ON FUNCTION public.search_mailroom_registrations(TEXT, INTEGER) IS 
'Efficiently searches mailroom registrations by email, name, or mailroom code. 
Uses database-level ILIKE filtering for better performance with large datasets.
Returns JSON array of matching registrations with related user and plan data.';
