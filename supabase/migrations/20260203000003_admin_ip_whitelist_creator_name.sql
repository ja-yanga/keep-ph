-- Extend admin_list_ip_whitelist to return creator display name (from KYC or email)
CREATE OR REPLACE FUNCTION public.admin_list_ip_whitelist()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  result JSON := '[]'::JSON;
BEGIN
  SELECT COALESCE(
    JSON_AGG(
      JSON_BUILD_OBJECT(
        'admin_ip_whitelist_id', w.admin_ip_whitelist_id,
        'ip_cidr', w.ip_cidr::TEXT,
        'description', w.description,
        'created_at', w.created_at,
        'created_by', w.created_by,
        'created_by_name', COALESCE(
          NULLIF(TRIM(CONCAT(k.user_kyc_first_name, ' ', k.user_kyc_last_name)), ''),
          u.users_email,
          '—'
        ),
        'updated_at', w.updated_at,
        'updated_by', w.updated_by
      )
      ORDER BY w.created_at DESC
    ),
    '[]'::JSON
  )
  INTO result
  FROM public.admin_ip_whitelist_table w
  LEFT JOIN public.users_table u ON u.users_id = w.created_by
  LEFT JOIN public.user_kyc_table k ON k.user_id = u.users_id;

  RETURN result;
END;
$$;
