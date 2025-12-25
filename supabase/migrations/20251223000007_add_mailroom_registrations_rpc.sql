-- RPC: get user mailroom registrations with related data
CREATE OR REPLACE FUNCTION get_user_mailroom_registrations(input_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  result JSON := '[]'::JSON;
BEGIN
  IF input_user_id IS NULL THEN
    RETURN '[]'::JSON;
  END IF;

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
      ORDER BY r.mailroom_registration_created_at DESC
    ),
    '[]'::JSON
  )
  INTO result
  FROM public.mailroom_registration_table r
  LEFT JOIN public.mailroom_location_table l ON l.mailroom_location_id = r.mailroom_location_id
  LEFT JOIN public.mailroom_plan_table p ON p.mailroom_plan_id = r.mailroom_plan_id
  LEFT JOIN public.subscription_table s ON s.mailroom_registration_id = r.mailroom_registration_id
  LEFT JOIN public.users_table u ON u.users_id = r.user_id
  LEFT JOIN public.user_kyc_table k ON k.user_id = u.users_id
  WHERE r.user_id = input_user_id;

  RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_mailroom_registrations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_mailroom_registrations(UUID) TO anon;

