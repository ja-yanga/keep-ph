-- Add user agent column to activity_log_table
ALTER TABLE public.activity_log_table 
ADD COLUMN IF NOT EXISTS activity_user_agent TEXT;

-- RPC for admin to list activity logs with filtering and pagination
DROP FUNCTION IF EXISTS public.admin_list_activity_logs(JSONB);
CREATE OR REPLACE FUNCTION public.admin_list_activity_logs(input_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  -- Pagination
  input_limit INTEGER := COALESCE((input_data->>'limit')::INTEGER, 10);
  input_offset INTEGER := COALESCE((input_data->>'offset')::INTEGER, 0);
  
  -- Filters
  input_user_id UUID := (input_data->>'user_id')::UUID;
  input_actor_id UUID := (input_data->>'actor_id')::UUID; -- synonymous with user_id in this context
  input_action TEXT := (input_data->>'action')::TEXT;
  input_entity_type TEXT := (input_data->>'entity_type')::TEXT;
  input_entity_id UUID := (input_data->>'entity_id')::UUID;
  input_date_from TIMESTAMP WITH TIME ZONE := (input_data->>'date_from')::TIMESTAMP WITH TIME ZONE;
  input_date_to TIMESTAMP WITH TIME ZONE := (input_data->>'date_to')::TIMESTAMP WITH TIME ZONE;
  input_search TEXT := (input_data->>'search')::TEXT;

  -- Results
  result_count INTEGER;
  result_data JSONB;
  return_data JSONB;
BEGIN
  -- Build the base query and count
  WITH filtered_logs AS (
    SELECT 
      al.*,
      u.users_email as actor_email,
      COALESCE(uk.user_kyc_first_name || ' ' || uk.user_kyc_last_name, u.users_email) as actor_name
    FROM public.activity_log_table al
    LEFT JOIN public.users_table u ON al.user_id = u.users_id
    LEFT JOIN public.user_kyc_table uk ON u.users_id = uk.user_id
    WHERE 
      (input_user_id IS NULL OR al.user_id = input_user_id)
      AND (input_actor_id IS NULL OR al.user_id = input_actor_id)
      AND (input_action IS NULL OR al.activity_action::TEXT = input_action)
      AND (input_entity_type IS NULL OR al.activity_entity_type::TEXT = input_entity_type)
      AND (input_entity_id IS NULL OR al.activity_entity_id = input_entity_id)
      AND (input_date_from IS NULL OR al.activity_created_at >= input_date_from)
      AND (input_date_to IS NULL OR al.activity_created_at <= input_date_to)
      AND (
        input_search IS NULL 
        OR al.activity_details::TEXT ILIKE '%' || input_search || '%'
        OR u.users_email ILIKE '%' || input_search || '%'
        OR uk.user_kyc_first_name ILIKE '%' || input_search || '%'
        OR uk.user_kyc_last_name ILIKE '%' || input_search || '%'
      )
  )
  SELECT 
    (SELECT COUNT(*) FROM filtered_logs),
    COALESCE(
      JSONB_AGG(sub.log_entry), 
      '[]'::JSONB
    )
  INTO result_count, result_data
  FROM (
    SELECT 
      JSONB_BUILD_OBJECT(
        'activity_log_id', activity_log_id,
        'user_id', user_id,
        'activity_action', activity_action,
        'activity_type', activity_type,
        'activity_entity_type', activity_entity_type,
        'activity_entity_id', activity_entity_id,
        'activity_details', activity_details,
        'activity_ip_address', activity_ip_address,
        'activity_user_agent', activity_user_agent,
        'activity_created_at', activity_created_at,
        'actor_email', actor_email,
        'actor_name', actor_name
      ) as log_entry
    FROM filtered_logs
    ORDER BY activity_created_at DESC
    LIMIT input_limit
    OFFSET input_offset
  ) sub;

  return_data := JSONB_BUILD_OBJECT(
    'total_count', result_count,
    'logs', result_data
  );

  RETURN return_data;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.admin_list_activity_logs(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_activity_logs(JSONB) TO service_role;
