-- Add PayMongo plan IDs to mailroom_plan_table for reusing plans (monthly and annual)
ALTER TABLE public.mailroom_plan_table
ADD COLUMN IF NOT EXISTS paymongo_plan_id_monthly TEXT,
ADD COLUMN IF NOT EXISTS paymongo_plan_id_annual TEXT;

COMMENT ON COLUMN public.mailroom_plan_table.paymongo_plan_id_monthly IS 'PayMongo Plan ID for monthly billing (from seed or manual creation)';
COMMENT ON COLUMN public.mailroom_plan_table.paymongo_plan_id_annual IS 'PayMongo Plan ID for annual billing (from seed or manual creation)';

-- get_mailroom_plans: include PayMongo plan IDs so registration can pass them to create-subscription
CREATE OR REPLACE FUNCTION get_mailroom_plans()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    return_data JSONB;
BEGIN
    SELECT 
        jsonb_agg(mailroom_plan_table)
    INTO 
        return_data
    FROM (
        SELECT 
            mailroom_plan_id,
            mailroom_plan_name,
            mailroom_plan_price,
            mailroom_plan_description,
            mailroom_plan_storage_limit,
            mailroom_plan_can_receive_mail,
            mailroom_plan_can_receive_parcels,
            mailroom_plan_can_digitize,
            paymongo_plan_id_monthly,
            paymongo_plan_id_annual
        FROM mailroom_plan_table
        ORDER BY mailroom_plan_price ASC
    ) AS mailroom_plan_table;

    RETURN COALESCE(return_data, '[]'::JSONB);
END;
$$;

-- admin_list_mailroom_plans: include PayMongo plan IDs
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
        'mailroom_plan_can_digitize', mailroom_plan_can_digitize,
        'paymongo_plan_id_monthly', paymongo_plan_id_monthly,
        'paymongo_plan_id_annual', paymongo_plan_id_annual
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
