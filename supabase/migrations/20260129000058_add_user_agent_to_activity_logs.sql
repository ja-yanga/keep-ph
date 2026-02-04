BEGIN;

ALTER TABLE public.activity_log_table
ADD COLUMN IF NOT EXISTS activity_user_agent TEXT;

ALTER TABLE public.activity_log_table
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Backfill existing rows
UPDATE public.activity_log_table
SET search_vector =
  to_tsvector(
    'simple',
    coalesce(activity_details::TEXT, '') || ' ' ||
    coalesce(activity_action::TEXT, '') || ' ' ||
    coalesce(activity_entity_type::TEXT, '')
  )
WHERE search_vector IS NULL;

-- Trigger function
CREATE OR REPLACE FUNCTION public.activity_log_search_vector_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector(
      'simple',
      coalesce(NEW.activity_details::TEXT, '') || ' ' ||
      coalesce(NEW.activity_action::TEXT, '') || ' ' ||
      coalesce(NEW.activity_entity_type::TEXT, '')
    );
  RETURN NEW;
END;
$$;

-- Trigger
DROP TRIGGER IF EXISTS trg_activity_log_search_vector
ON public.activity_log_table;

CREATE TRIGGER trg_activity_log_search_vector
BEFORE INSERT OR UPDATE
ON public.activity_log_table
FOR EACH ROW
EXECUTE FUNCTION public.activity_log_search_vector_trigger();

-- Full-text search
CREATE INDEX IF NOT EXISTS idx_activity_log_search
ON public.activity_log_table
USING GIN (search_vector);

-- Default admin listing (keyset pagination)
CREATE INDEX IF NOT EXISTS idx_activity_log_admin_main
ON public.activity_log_table (
  activity_created_at DESC,
  activity_log_id DESC
);

-- Common filters
CREATE INDEX IF NOT EXISTS idx_activity_log_action
ON public.activity_log_table (activity_action);

CREATE INDEX IF NOT EXISTS idx_activity_log_entity_type
ON public.activity_log_table (activity_entity_type);

CREATE INDEX IF NOT EXISTS idx_activity_log_user_date
ON public.activity_log_table (
  user_id,
  activity_created_at DESC
);


DROP FUNCTION IF EXISTS public.admin_list_activity_logs(JSONB);

CREATE OR REPLACE FUNCTION public.admin_list_activity_logs(input_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  -- Pagination
  input_limit INTEGER := COALESCE((input_data->>'limit')::INTEGER, 20);
  input_offset INTEGER := COALESCE((input_data->>'offset')::INTEGER, 0);
  
  -- Filters
  input_user_id UUID := (input_data->>'user_id')::UUID;
  input_actor_id UUID := (input_data->>'actor_id')::UUID;
  input_action TEXT := (input_data->>'action')::TEXT;
  input_entity_type TEXT := (input_data->>'entity_type')::TEXT;
  input_entity_id UUID := (input_data->>'entity_id')::UUID;
  input_date_from TIMESTAMPTZ := (input_data->>'date_from')::TIMESTAMPTZ;
  input_date_to TIMESTAMPTZ := (input_data->>'date_to')::TIMESTAMPTZ;
  input_search TEXT := (input_data->>'search')::TEXT;
  
  -- Sorting
  input_sort_by TEXT := COALESCE((input_data->>'sort_by')::TEXT, 'activity_created_at');
  input_sort_direction TEXT := COALESCE(LOWER((input_data->>'sort_direction')::TEXT), 'desc');

  -- End date adjustment: make it inclusive of the entire day if provided
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
        'activity_log_id', al.activity_log_id,
        'user_id', al.user_id,
        'activity_action', al.activity_action,
        'activity_type', al.activity_type,
        'activity_entity_type', al.activity_entity_type,
        'activity_entity_id', al.activity_entity_id,
        'activity_details', al.activity_details,
        'activity_ip_address', al.activity_ip_address,
        'activity_user_agent', al.activity_user_agent,
        'activity_created_at', al.activity_created_at,
        'actor_email', u.users_email,
        'actor_name',
          COALESCE(
            uk.user_kyc_first_name || ' ' || uk.user_kyc_last_name,
            u.users_email
          )
      ) AS log_entry,
      COUNT(*) OVER() AS total_count
    FROM public.activity_log_table al
    LEFT JOIN public.users_table u
      ON al.user_id = u.users_id
    LEFT JOIN public.user_kyc_table uk
      ON u.users_id = uk.user_id
    WHERE
      (input_user_id IS NULL OR al.user_id = input_user_id)
      AND (input_actor_id IS NULL OR al.user_id = input_actor_id)
      AND (input_action IS NULL OR al.activity_action::TEXT = input_action)
      AND (input_entity_type IS NULL OR al.activity_entity_type::TEXT = input_entity_type)
      AND (input_entity_id IS NULL OR al.activity_entity_id = input_entity_id)
      AND (input_date_from IS NULL OR al.activity_created_at >= input_date_from)
      AND (adjusted_date_to IS NULL OR al.activity_created_at <= adjusted_date_to)
      AND (
        input_search IS NULL
        OR al.search_vector @@ plainto_tsquery('simple', input_search)
        OR al.activity_details::TEXT ILIKE '%' || input_search || '%'
        OR u.users_email ILIKE '%' || input_search || '%'
        OR uk.user_kyc_first_name ILIKE '%' || input_search || '%'
        OR uk.user_kyc_last_name ILIKE '%' || input_search || '%'
      )
    ORDER BY
      -- Handle Timestamp Sorting
      CASE WHEN input_sort_direction = 'asc' AND input_sort_by = 'activity_created_at' THEN al.activity_created_at END ASC,
      CASE WHEN input_sort_direction = 'desc' AND input_sort_by = 'activity_created_at' THEN al.activity_created_at END DESC,
      
      -- Handle Text/Enum Sorting
      CASE WHEN input_sort_direction = 'asc' THEN
        CASE 
          WHEN input_sort_by = 'actor_email' THEN u.users_email
          WHEN input_sort_by = 'activity_entity_type' THEN al.activity_entity_type::TEXT
          WHEN input_sort_by = 'activity_action' THEN al.activity_action::TEXT
          ELSE NULL 
        END
      END ASC,
      CASE WHEN input_sort_direction = 'desc' THEN
        CASE 
          WHEN input_sort_by = 'actor_email' THEN u.users_email
          WHEN input_sort_by = 'activity_entity_type' THEN al.activity_entity_type::TEXT
          WHEN input_sort_by = 'activity_action' THEN al.activity_action::TEXT
          ELSE NULL 
        END
      END DESC,
      
      -- tie-breaker
      al.activity_log_id DESC
    LIMIT input_limit
    OFFSET input_offset
  ) sub;

  RETURN return_data;
END;
$$;


GRANT EXECUTE ON FUNCTION public.admin_list_activity_logs(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_activity_logs(JSONB) TO service_role;

COMMIT;
