-- RPCs for managing entries in user_address_table
CREATE OR REPLACE FUNCTION public.user_list_addresses(input_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  result JSON := '[]'::JSON;
BEGIN
  IF input_user_id IS NULL THEN
    RETURN result;
  END IF;

  SELECT COALESCE(
    JSON_AGG(
      JSON_BUILD_OBJECT(
        'user_address_id', user_address_id,
        'user_id', user_id,
        'user_address_label', user_address_label,
        'user_address_line1', user_address_line1,
        'user_address_line2', user_address_line2,
        'user_address_city', user_address_city,
        'user_address_region', user_address_region,
        'user_address_postal', user_address_postal,
        'user_address_is_default', user_address_is_default,
        'user_address_created_at', user_address_created_at
      )
      ORDER BY user_address_is_default DESC,
               user_address_created_at DESC
    ),
    '[]'::JSON
  )
  INTO result
  FROM public.user_address_table
  WHERE user_id = input_user_id;

  RETURN result;
END;
$$;


CREATE OR REPLACE FUNCTION public.user_create_address(
  input_user_id UUID,
  input_line1 TEXT,
  input_label TEXT DEFAULT NULL,
  input_line2 TEXT DEFAULT NULL,
  input_city TEXT DEFAULT NULL,
  input_region TEXT DEFAULT NULL,
  input_postal TEXT DEFAULT NULL,
  input_is_default BOOLEAN DEFAULT FALSE
)
RETURNS public.user_address_table
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  new_row public.user_address_table%ROWTYPE;
BEGIN
  IF input_user_id IS NULL OR input_line1 IS NULL THEN
    RAISE EXCEPTION 'user id and line1 are required';
  END IF;

  IF COALESCE(input_is_default, FALSE) THEN
    UPDATE public.user_address_table
    SET user_address_is_default = FALSE
    WHERE user_id = input_user_id;
  END IF;

  INSERT INTO public.user_address_table (
    user_id,
    user_address_label,
    user_address_line1,
    user_address_line2,
    user_address_city,
    user_address_region,
    user_address_postal,
    user_address_is_default
  )
  VALUES (
    input_user_id,
    NULLIF(TRIM(input_label), ''),
    input_line1,
    NULLIF(TRIM(input_line2), ''),
    NULLIF(TRIM(input_city), ''),
    NULLIF(TRIM(input_region), ''),
    NULLIF(TRIM(input_postal), ''),
    COALESCE(input_is_default, FALSE)
  )
  RETURNING * INTO new_row;

  RETURN new_row;
END;
$$;


CREATE OR REPLACE FUNCTION public.user_update_address(
  input_user_address_id UUID,
  input_line1 TEXT,
  input_label TEXT DEFAULT NULL,
  input_line2 TEXT DEFAULT NULL,
  input_city TEXT DEFAULT NULL,
  input_region TEXT DEFAULT NULL,
  input_postal TEXT DEFAULT NULL,
  input_is_default BOOLEAN DEFAULT FALSE
)
RETURNS public.user_address_table
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  target_row public.user_address_table%ROWTYPE;
  updated_row public.user_address_table%ROWTYPE;
BEGIN
  IF input_user_address_id IS NULL OR input_line1 IS NULL THEN
    RAISE EXCEPTION 'address id and line1 are required';
  END IF;

  SELECT *
  INTO target_row
  FROM public.user_address_table
  WHERE user_address_id = input_user_address_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Address not found';
  END IF;

  IF COALESCE(input_is_default, FALSE) THEN
    UPDATE public.user_address_table
    SET user_address_is_default = FALSE
    WHERE user_id = target_row.user_id;
  END IF;

  UPDATE public.user_address_table
  SET
    user_address_label = NULLIF(TRIM(input_label), ''),
    user_address_line1 = input_line1,
    user_address_line2 = NULLIF(TRIM(input_line2), ''),
    user_address_city = NULLIF(TRIM(input_city), ''),
    user_address_region = NULLIF(TRIM(input_region), ''),
    user_address_postal = NULLIF(TRIM(input_postal), ''),
    user_address_is_default = COALESCE(input_is_default, FALSE)
  WHERE user_address_id = input_user_address_id
  RETURNING * INTO updated_row;

  RETURN updated_row;
END;
$$;


CREATE OR REPLACE FUNCTION public.user_delete_address(
  input_user_address_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  IF input_user_address_id IS NULL THEN
    RETURN FALSE;
  END IF;

  DELETE FROM public.user_address_table
  WHERE user_address_id = input_user_address_id;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count > 0;
END;
$$;
