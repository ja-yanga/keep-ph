CREATE OR REPLACE FUNCTION admin_list_ip_whitelist()
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
        'updated_at', w.updated_at,
        'updated_by', w.updated_by
      )
      ORDER BY w.created_at DESC
    ),
    '[]'::JSON
  )
  INTO result
  FROM public.admin_ip_whitelist_table w;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION admin_create_ip_whitelist(
  input_ip_cidr TEXT,
  input_description TEXT DEFAULT NULL,
  input_created_by UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  inserted_row public.admin_ip_whitelist_table%ROWTYPE;
BEGIN
  IF input_ip_cidr IS NULL OR TRIM(input_ip_cidr) = '' THEN
    RAISE EXCEPTION 'ip_cidr is required';
  END IF;

  INSERT INTO public.admin_ip_whitelist_table (
    ip_cidr,
    description,
    created_by
  )
  VALUES (
    input_ip_cidr::CIDR,
    NULLIF(TRIM(input_description), ''),
    input_created_by
  )
  RETURNING * INTO inserted_row;

  RETURN JSON_BUILD_OBJECT(
    'admin_ip_whitelist_id', inserted_row.admin_ip_whitelist_id,
    'ip_cidr', inserted_row.ip_cidr::TEXT,
    'description', inserted_row.description,
    'created_at', inserted_row.created_at,
    'created_by', inserted_row.created_by,
    'updated_at', inserted_row.updated_at,
    'updated_by', inserted_row.updated_by
  );
END;
$$;

CREATE OR REPLACE FUNCTION admin_update_ip_whitelist(
  input_id UUID,
  input_ip_cidr TEXT,
  input_description TEXT DEFAULT NULL,
  input_updated_by UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  updated_row public.admin_ip_whitelist_table%ROWTYPE;
BEGIN
  IF input_id IS NULL THEN
    RAISE EXCEPTION 'id is required';
  END IF;

  IF input_ip_cidr IS NULL OR TRIM(input_ip_cidr) = '' THEN
    RAISE EXCEPTION 'ip_cidr is required';
  END IF;

  UPDATE public.admin_ip_whitelist_table
  SET
    ip_cidr = input_ip_cidr::CIDR,
    description = NULLIF(TRIM(input_description), ''),
    updated_at = NOW(),
    updated_by = input_updated_by
  WHERE admin_ip_whitelist_id = input_id
  RETURNING * INTO updated_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entry not found';
  END IF;

  RETURN JSON_BUILD_OBJECT(
    'admin_ip_whitelist_id', updated_row.admin_ip_whitelist_id,
    'ip_cidr', updated_row.ip_cidr::TEXT,
    'description', updated_row.description,
    'created_at', updated_row.created_at,
    'created_by', updated_row.created_by,
    'updated_at', updated_row.updated_at,
    'updated_by', updated_row.updated_by
  );
END;
$$;

CREATE OR REPLACE FUNCTION admin_delete_ip_whitelist(
  input_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  deleted_row public.admin_ip_whitelist_table%ROWTYPE;
BEGIN
  IF input_id IS NULL THEN
    RAISE EXCEPTION 'id is required';
  END IF;

  DELETE FROM public.admin_ip_whitelist_table
  WHERE admin_ip_whitelist_id = input_id
  RETURNING * INTO deleted_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entry not found';
  END IF;

  RETURN JSON_BUILD_OBJECT(
    'admin_ip_whitelist_id', deleted_row.admin_ip_whitelist_id,
    'ip_cidr', deleted_row.ip_cidr::TEXT,
    'description', deleted_row.description,
    'created_at', deleted_row.created_at,
    'created_by', deleted_row.created_by,
    'updated_at', deleted_row.updated_at,
    'updated_by', deleted_row.updated_by
  );
END;
$$;
