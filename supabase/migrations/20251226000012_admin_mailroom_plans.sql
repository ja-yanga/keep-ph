-- Get all mailroom plans for admin views
CREATE OR REPLACE FUNCTION public.admin_list_mailroom_plans()
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
        'mailroom_plan_id', mailroom_plan_id,
        'mailroom_plan_name', mailroom_plan_name,
        'mailroom_plan_price', mailroom_plan_price,
        'mailroom_plan_description', mailroom_plan_description,
        'mailroom_plan_storage_limit', mailroom_plan_storage_limit,
        'mailroom_plan_can_receive_mail', mailroom_plan_can_receive_mail,
        'mailroom_plan_can_receive_parcels', mailroom_plan_can_receive_parcels,
        'mailroom_plan_can_digitize', mailroom_plan_can_digitize
      )
      ORDER BY mailroom_plan_price ASC
    ),
    '[]'::JSON
  )
  INTO result
  FROM public.mailroom_plan_table;

  RETURN result;
END;
$$;

--Update a mailroom plan
CREATE OR REPLACE FUNCTION public.admin_update_mailroom_plan(
  input_plan_id UUID,
  input_updates JSONB
)
RETURNS public.mailroom_plan_table
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  updated_plan public.mailroom_plan_table%ROWTYPE;
BEGIN
  IF input_plan_id IS NULL THEN
    RAISE EXCEPTION 'plan id is required';
  END IF;

  IF input_updates IS NULL OR jsonb_typeof(input_updates) <> 'object' THEN
    RAISE EXCEPTION 'input_updates must be a JSON object';
  END IF;

  UPDATE public.mailroom_plan_table
  SET
    mailroom_plan_name = CASE
      WHEN input_updates ? 'name'
        THEN COALESCE(NULLIF(TRIM(input_updates->>'name'), ''), mailroom_plan_name)
      ELSE mailroom_plan_name
    END,
    mailroom_plan_price = CASE
      WHEN input_updates ? 'price'
        THEN (input_updates->>'price')::NUMERIC
      ELSE mailroom_plan_price
    END,
    mailroom_plan_description = CASE
      WHEN input_updates ? 'description'
        THEN input_updates->>'description'
      ELSE mailroom_plan_description
    END,
    mailroom_plan_storage_limit = CASE
      WHEN input_updates ? 'storage_limit'
        THEN (input_updates->>'storage_limit')::NUMERIC
      ELSE mailroom_plan_storage_limit
    END,
    mailroom_plan_can_receive_mail = CASE
      WHEN input_updates ? 'can_receive_mail'
        THEN COALESCE((input_updates->>'can_receive_mail')::BOOLEAN, mailroom_plan_can_receive_mail)
      ELSE mailroom_plan_can_receive_mail
    END,
    mailroom_plan_can_receive_parcels = CASE
      WHEN input_updates ? 'can_receive_parcels'
        THEN COALESCE((input_updates->>'can_receive_parcels')::BOOLEAN, mailroom_plan_can_receive_parcels)
      ELSE mailroom_plan_can_receive_parcels
    END,
    mailroom_plan_can_digitize = CASE
      WHEN input_updates ? 'can_digitize'
        THEN COALESCE((input_updates->>'can_digitize')::BOOLEAN, mailroom_plan_can_digitize)
      ELSE mailroom_plan_can_digitize
    END
  WHERE mailroom_plan_id = input_plan_id
  RETURNING *
  INTO updated_plan;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'plan not found';
  END IF;

  RETURN updated_plan;
END;
$$;
