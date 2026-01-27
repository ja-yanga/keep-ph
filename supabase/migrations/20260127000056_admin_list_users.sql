CREATE OR REPLACE FUNCTION public.admin_list_users(
  input_search TEXT DEFAULT '',
  input_limit INT DEFAULT 10,
  input_offset INT DEFAULT 0,
  input_sort TEXT DEFAULT 'users_created_at',
  input_direction TEXT DEFAULT 'desc'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  sort_col TEXT;
  sort_dir TEXT;
  where_sql TEXT;
  base_sql TEXT;
  data_sql TEXT;
  count_sql TEXT;
  final_sql TEXT;
  result_json JSONB;
BEGIN
  sort_col := CASE input_sort
    WHEN 'users_email' THEN 'u.users_email'
    WHEN 'users_role' THEN 'u.users_role'
    WHEN 'users_created_at' THEN 'u.users_created_at'
    WHEN 'full_name' THEN 'k.user_kyc_first_name'
    ELSE 'u.users_created_at'
  END;

  sort_dir := CASE LOWER(input_direction)
    WHEN 'asc' THEN 'ASC'
    ELSE 'DESC'
  END;

  IF input_search IS NULL OR btrim(input_search) = '' THEN
    where_sql := 'TRUE';
  ELSE
    where_sql := format(
      '(u.users_email ILIKE %L OR u.users_role ILIKE %L OR k.user_kyc_first_name ILIKE %L OR k.user_kyc_last_name ILIKE %L OR CONCAT(k.user_kyc_first_name, '' '', k.user_kyc_last_name) ILIKE %L)',
      '%' || input_search || '%',
      '%' || input_search || '%',
      '%' || input_search || '%',
      '%' || input_search || '%',
      '%' || input_search || '%'
    );
  END IF;

  base_sql := '
    FROM public.users_table u
    LEFT JOIN public.user_kyc_table k ON k.user_id = u.users_id
    WHERE ' || where_sql;

  IF input_sort = 'full_name' THEN
    data_sql := '
      SELECT
        u.users_id,
        u.users_email,
        u.users_role,
        u.users_created_at,
        u.users_is_verified,
        jsonb_build_object(
          ''user_kyc_first_name'', k.user_kyc_first_name,
          ''user_kyc_last_name'', k.user_kyc_last_name
        ) AS user_kyc_table
      ' || base_sql || '
      ORDER BY k.user_kyc_first_name ' || sort_dir || ' NULLS LAST,
               k.user_kyc_last_name ' || sort_dir || ' NULLS LAST
      LIMIT ' || input_limit || '
      OFFSET ' || input_offset;
  ELSE
    data_sql := '
      SELECT
        u.users_id,
        u.users_email,
        u.users_role,
        u.users_created_at,
        u.users_is_verified,
        jsonb_build_object(
          ''user_kyc_first_name'', k.user_kyc_first_name,
          ''user_kyc_last_name'', k.user_kyc_last_name
        ) AS user_kyc_table
      ' || base_sql || '
      ORDER BY ' || sort_col || ' ' || sort_dir || '
      LIMIT ' || input_limit || '
      OFFSET ' || input_offset;
  END IF;

  count_sql := 'SELECT count(*) ' || base_sql;

  final_sql := '
    SELECT jsonb_build_object(
      ''data'',
      COALESCE(jsonb_agg(to_jsonb(t)), ''[]''::jsonb),
      ''total_count'',
      (' || count_sql || ')
    )
    FROM (' || data_sql || ') t';

  EXECUTE final_sql INTO result_json;
  RETURN result_json;
END;
$$;