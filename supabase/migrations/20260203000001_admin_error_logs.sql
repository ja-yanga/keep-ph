BEGIN;

DROP FUNCTION IF EXISTS public.admin_list_error_logs(JSONB);

CREATE OR REPLACE FUNCTION public.admin_list_error_logs(input_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  input_limit INTEGER := COALESCE((input_data->>'limit')::INTEGER, 20);
  input_offset INTEGER := COALESCE((input_data->>'offset')::INTEGER, 0);

  input_error_type TEXT := NULLIF(input_data->>'error_type', '');
  input_error_code TEXT := NULLIF(input_data->>'error_code', '');
  input_error_resolved BOOLEAN := CASE
    WHEN NULLIF(input_data->>'error_resolved', '') IS NULL THEN NULL
    ELSE (input_data->>'error_resolved')::BOOLEAN
  END;
  input_date_from TIMESTAMPTZ := (input_data->>'date_from')::TIMESTAMPTZ;
  input_date_to TIMESTAMPTZ := (input_data->>'date_to')::TIMESTAMPTZ;
  input_request_path TEXT := NULLIF(input_data->>'request_path', '');
  input_user_id UUID := NULLIF(input_data->>'user_id', '')::UUID;
  input_sort_by TEXT := COALESCE(NULLIF(input_data->>'sort_by', ''), 'error_created_at');
  input_sort_direction TEXT := COALESCE(NULLIF(input_data->>'sort_direction', ''), 'desc');

  adjusted_date_to TIMESTAMPTZ := CASE
    WHEN input_date_to IS NOT NULL THEN (input_date_to + interval '1 day' - interval '1 microsecond')
    ELSE NULL
  END;

  return_data JSONB;
BEGIN
  SELECT
    JSONB_BUILD_OBJECT(
      'total_count', COALESCE(MAX(sub.total_count), 0),
      'logs', COALESCE(JSONB_AGG(sub.log_entry), '[]'::JSONB)
    )
  INTO return_data
  FROM (
    SELECT
      JSONB_BUILD_OBJECT(
        'error_log_id', el.error_log_id,
        'user_id', el.user_id,
        'error_type', el.error_type,
        'error_code', el.error_code,
        'error_message', el.error_message,
        'request_path', el.request_path,
        'response_status', el.response_status,
        'error_resolved', el.error_resolved,
        'error_created_at', el.error_created_at,
        'user_email', u.users_email
      ) AS log_entry,
      COUNT(*) OVER() AS total_count
    FROM public.error_log_table el
    LEFT JOIN public.users_table u
      ON el.user_id = u.users_id
    WHERE
      (input_error_type IS NULL OR el.error_type::TEXT = input_error_type)
      AND (input_error_code IS NULL OR el.error_code::TEXT ILIKE '%' || input_error_code || '%')
      AND (input_error_resolved IS NULL OR el.error_resolved = input_error_resolved)
      AND (input_request_path IS NULL OR el.request_path ILIKE '%' || input_request_path || '%')
      AND (input_user_id IS NULL OR el.user_id = input_user_id)
      AND (input_date_from IS NULL OR el.error_created_at >= input_date_from)
      AND (adjusted_date_to IS NULL OR el.error_created_at <= adjusted_date_to)
    ORDER BY
      CASE WHEN input_sort_by = 'error_created_at' AND input_sort_direction = 'asc' THEN el.error_created_at END ASC,
      CASE WHEN input_sort_by = 'error_created_at' AND input_sort_direction = 'desc' THEN el.error_created_at END DESC,
      CASE WHEN input_sort_by = 'error_type' AND input_sort_direction = 'asc' THEN el.error_type::TEXT END ASC,
      CASE WHEN input_sort_by = 'error_type' AND input_sort_direction = 'desc' THEN el.error_type::TEXT END DESC,
      CASE WHEN input_sort_by = 'error_code' AND input_sort_direction = 'asc' THEN el.error_code::TEXT END ASC,
      CASE WHEN input_sort_by = 'error_code' AND input_sort_direction = 'desc' THEN el.error_code::TEXT END DESC,
      CASE WHEN input_sort_by = 'response_status' AND input_sort_direction = 'asc' THEN el.response_status END ASC,
      CASE WHEN input_sort_by = 'response_status' AND input_sort_direction = 'desc' THEN el.response_status END DESC,
      CASE WHEN input_sort_by = 'request_path' AND input_sort_direction = 'asc' THEN el.request_path END ASC,
      CASE WHEN input_sort_by = 'request_path' AND input_sort_direction = 'desc' THEN el.request_path END DESC,
      CASE WHEN input_sort_by = 'error_resolved' AND input_sort_direction = 'asc' THEN el.error_resolved END ASC,
      CASE WHEN input_sort_by = 'error_resolved' AND input_sort_direction = 'desc' THEN el.error_resolved END DESC,
      el.error_created_at DESC,
      el.error_log_id DESC
    LIMIT input_limit
    OFFSET input_offset
  ) sub;

  RETURN return_data;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_error_logs(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_error_logs(JSONB) TO service_role;

COMMIT;
