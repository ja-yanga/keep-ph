-- Update RPC function to support search and pagination
CREATE OR REPLACE FUNCTION get_user_mailroom_registrations(
  input_user_id UUID,
  search_query TEXT DEFAULT NULL,
  page_limit INTEGER DEFAULT NULL,
  page_offset INTEGER DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  result JSON := '[]'::JSON;
  total_count INTEGER := 0;
  search_filter TEXT := '';
  validated_limit INTEGER;
  validated_offset INTEGER;
BEGIN
  IF input_user_id IS NULL THEN
    RETURN json_build_object(
      'data', '[]'::JSON,
      'pagination', json_build_object(
        'total', 0,
        'limit', 0,
        'offset', 0,
        'has_more', false
      )
    );
  END IF;

  -- Validate and set defaults for pagination
  validated_limit := COALESCE(NULLIF(page_limit, 0), NULL);
  validated_offset := COALESCE(NULLIF(page_offset, 0), 0);

  -- Build search filter
  IF search_query IS NOT NULL AND search_query != '' THEN
    search_filter := '%' || TRIM(search_query) || '%';
  END IF;

  -- Get total count (for pagination metadata)
  SELECT COUNT(*)
  INTO total_count
  FROM public.mailroom_registration_table r
  LEFT JOIN public.mailroom_location_table l ON l.mailroom_location_id = r.mailroom_location_id
  LEFT JOIN public.mailroom_plan_table p ON p.mailroom_plan_id = r.mailroom_plan_id
  WHERE r.user_id = input_user_id
    AND (
      search_filter = '' OR
      COALESCE(l.mailroom_location_name, '') ILIKE search_filter OR
      COALESCE(p.mailroom_plan_name, '') ILIKE search_filter
    );

  -- Get paginated data
  SELECT COALESCE(
    JSON_AGG(
      JSON_BUILD_OBJECT(
        'mailroom_registration_id', r.mailroom_registration_id,
        'user_id', r.user_id,
        'mailroom_location_id', r.mailroom_location_id,
        'mailroom_plan_id', r.mailroom_plan_id,
        'mailroom_registration_code', r.mailroom_registration_code,
        'mailroom_registration_status', r.mailroom_registration_status,
        'mailroom_registration_created_at', r.mailroom_registration_created_at,
        'mailroom_registration_updated_at', r.mailroom_registration_updated_at,
        'mailroom_location_table', CASE
          WHEN l.mailroom_location_id IS NOT NULL THEN JSON_BUILD_OBJECT(
            'mailroom_location_id', l.mailroom_location_id,
            'mailroom_location_name', l.mailroom_location_name,
            'mailroom_location_city', l.mailroom_location_city,
            'mailroom_location_region', l.mailroom_location_region,
            'mailroom_location_barangay', l.mailroom_location_barangay,
            'mailroom_location_zip', l.mailroom_location_zip
          )
          ELSE NULL
        END,
        'mailbox_item_table', COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'mailbox_item_id', mit.mailbox_item_id,
                'mailbox_item_name', mit.mailbox_item_name,
                'mailbox_item_status', mit.mailbox_item_status,
                'mailbox_item_type', mit.mailbox_item_type,
                'mailbox_item_photo', mit.mailbox_item_photo,
                'mailbox_item_received_at', mit.mailbox_item_received_at,
                'mailroom_file_table', (
                  SELECT json_agg(row_to_json(mft))
                  FROM public.mailroom_file_table mft
                  WHERE mft.mailbox_item_id = mit.mailbox_item_id
                )
              )
            )
            FROM public.mailbox_item_table mit
            WHERE mit.mailroom_registration_id = r.mailroom_registration_id
            AND mit.mailbox_item_deleted_at IS NULL
          ),
          '[]'::json
        ),
        'mailroom_plan_table', CASE
          WHEN p.mailroom_plan_id IS NOT NULL THEN JSON_BUILD_OBJECT(
            'mailroom_plan_id', p.mailroom_plan_id,
            'mailroom_plan_name', p.mailroom_plan_name,
            'mailroom_plan_price', p.mailroom_plan_price
          )
          ELSE NULL
        END,
        'subscription_table', CASE
          WHEN s.subscription_id IS NOT NULL THEN JSON_BUILD_OBJECT(
            'subscription_id', s.subscription_id,
            'subscription_expires_at', s.subscription_expires_at,
            'subscription_auto_renew', s.subscription_auto_renew,
            'subscription_started_at', s.subscription_started_at
          )
          ELSE NULL
        END,
        'users_table', CASE
          WHEN u.users_id IS NOT NULL THEN JSON_BUILD_OBJECT(
            'users_id', u.users_id,
            'users_email', u.users_email,
            'users_avatar_url', u.users_avatar_url,
            'mobile_number', u.mobile_number,
            'user_kyc_table', CASE
              WHEN k.user_kyc_id IS NOT NULL THEN JSON_BUILD_OBJECT(
                'user_kyc_first_name', k.user_kyc_first_name,
                'user_kyc_last_name', k.user_kyc_last_name,
                'user_kyc_status', k.user_kyc_status
              )
              ELSE NULL
            END
          )
          ELSE NULL
        END
      )
    ),
    '[]'::JSON
  )
  INTO result
  FROM (
    SELECT r.mailroom_registration_id
    FROM public.mailroom_registration_table r
    LEFT JOIN public.mailroom_location_table l ON l.mailroom_location_id = r.mailroom_location_id
    LEFT JOIN public.mailroom_plan_table p ON p.mailroom_plan_id = r.mailroom_plan_id
    WHERE r.user_id = input_user_id
      AND (
        search_filter = '' OR
        COALESCE(l.mailroom_location_name, '') ILIKE search_filter OR
        COALESCE(p.mailroom_plan_name, '') ILIKE search_filter
      )
    ORDER BY r.mailroom_registration_created_at DESC
    LIMIT validated_limit
    OFFSET validated_offset
  ) filtered_ids
  INNER JOIN public.mailroom_registration_table r ON r.mailroom_registration_id = filtered_ids.mailroom_registration_id
  LEFT JOIN public.mailroom_location_table l ON l.mailroom_location_id = r.mailroom_location_id
  LEFT JOIN public.mailroom_plan_table p ON p.mailroom_plan_id = r.mailroom_plan_id
  LEFT JOIN public.subscription_table s ON s.mailroom_registration_id = r.mailroom_registration_id
  LEFT JOIN public.users_table u ON u.users_id = r.user_id
  LEFT JOIN public.user_kyc_table k ON k.user_id = u.users_id;

  RETURN json_build_object(
    'data', COALESCE(result, '[]'::JSON),
    'pagination', json_build_object(
      'total', total_count,
      'limit', COALESCE(validated_limit, total_count),
      'offset', validated_offset,
      'has_more', CASE 
        WHEN validated_limit IS NOT NULL THEN (validated_offset + validated_limit) < total_count
        ELSE false
      END
    )
  );
END;
$$;

-- Update grants
GRANT EXECUTE ON FUNCTION public.get_user_mailroom_registrations(UUID, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_mailroom_registrations(UUID, TEXT, INTEGER, INTEGER) TO anon;
