-- RPC to fetch archived (soft-deleted) inventory records
CREATE OR REPLACE FUNCTION public.get_admin_archived_packages(
  input_limit INTEGER DEFAULT 50,
  input_offset INTEGER DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  result JSON;
  packages_json JSON;
  total_count INTEGER;
BEGIN
  -- Get total count of archived packages
  SELECT COUNT(*) INTO total_count
  FROM public.mailbox_item_table
  WHERE mailbox_item_deleted_at IS NOT NULL;

  -- Get archived packages with same structure as get_admin_mailroom_packages
  WITH archived_items AS (
    SELECT 
      mi.mailbox_item_id,
      mi.mailbox_item_name,
      mi.mailroom_registration_id,
      mi.location_locker_id,
      mi.mailbox_item_type,
      mi.mailbox_item_status,
      mi.mailbox_item_photo,
      mi.mailbox_item_received_at,
      mi.mailbox_item_created_at,
      mi.mailbox_item_updated_at,
      mi.mailbox_item_deleted_at,
      mr.mailroom_registration_id AS reg_id,
      mr.mailroom_registration_code,
      ll.location_locker_id AS locker_id,
      ll.location_locker_code,
      u.users_email,
      u.mobile_number,
      uk.user_kyc_first_name,
      uk.user_kyc_last_name,
      ml.mailroom_location_name,
      p.mailroom_plan_id,
      p.mailroom_plan_name,
      p.mailroom_plan_can_receive_mail,
      p.mailroom_plan_can_receive_parcels
    FROM public.mailbox_item_table mi
    LEFT JOIN public.mailroom_registration_table mr ON mr.mailroom_registration_id = mi.mailroom_registration_id
    LEFT JOIN public.location_locker_table ll ON ll.location_locker_id = mi.location_locker_id
    LEFT JOIN public.users_table u ON u.users_id = mr.user_id
    LEFT JOIN public.user_kyc_table uk ON uk.user_id = u.users_id
    LEFT JOIN public.mailroom_location_table ml ON ml.mailroom_location_id = mr.mailroom_location_id
    LEFT JOIN public.mailroom_plan_table p ON p.mailroom_plan_id = mr.mailroom_plan_id
    WHERE mi.mailbox_item_deleted_at IS NOT NULL
    ORDER BY mi.mailbox_item_deleted_at DESC
    LIMIT input_limit
    OFFSET input_offset
  )
  SELECT COALESCE(
    JSON_AGG(
      JSON_BUILD_OBJECT(
        'id', ai.mailbox_item_id,
        'package_name', ai.mailbox_item_name,
        'registration_id', ai.mailroom_registration_id,
        'locker_id', ai.location_locker_id,
        'package_type', ai.mailbox_item_type,
        'status', ai.mailbox_item_status,
        'package_photo', ai.mailbox_item_photo,
        'received_at', ai.mailbox_item_received_at,
        'mailbox_item_created_at', ai.mailbox_item_created_at,
        'mailbox_item_updated_at', ai.mailbox_item_updated_at,
        'deleted_at', ai.mailbox_item_deleted_at,
        'registration', CASE
          WHEN ai.reg_id IS NOT NULL THEN JSON_BUILD_OBJECT(
            'id', ai.reg_id,
            'full_name', COALESCE(
              CONCAT_WS(' ', ai.user_kyc_first_name, ai.user_kyc_last_name),
              ai.mailroom_location_name,
              'Unknown'
            ),
            'email', ai.users_email,
            'mobile', ai.mobile_number,
            'mailroom_code', ai.mailroom_registration_code,
            'mailroom_plans', CASE
              WHEN ai.mailroom_plan_id IS NOT NULL THEN JSON_BUILD_OBJECT(
                'name', ai.mailroom_plan_name,
                'can_receive_mail', ai.mailroom_plan_can_receive_mail,
                'can_receive_parcels', ai.mailroom_plan_can_receive_parcels
              )
              ELSE NULL
            END
          )
          ELSE NULL
        END,
        'locker', CASE
          WHEN ai.locker_id IS NOT NULL THEN JSON_BUILD_OBJECT(
            'id', ai.locker_id,
            'locker_code', ai.location_locker_code
          )
          ELSE NULL
        END
      )
    ),
    '[]'::JSON
  )
  INTO packages_json
  FROM archived_items ai;

  result := JSON_BUILD_OBJECT(
    'packages', packages_json,
    'total_count', total_count
  );

  RETURN result;
END;
$$;

-- RPC to restore archived package
CREATE OR REPLACE FUNCTION public.admin_restore_mailbox_item(input_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  var_item_id UUID;
  var_package_name TEXT;
  var_return_data JSONB;
BEGIN
  var_item_id := (input_data->>'id')::UUID;

  UPDATE public.mailbox_item_table
  SET mailbox_item_deleted_at = NULL,
      mailbox_item_updated_at = NOW()
  WHERE mailbox_item_id = var_item_id
  RETURNING mailbox_item_name INTO var_package_name;

  IF var_package_name IS NULL THEN
    RAISE EXCEPTION 'Package not found';
  END IF;

  var_return_data := JSONB_BUILD_OBJECT(
    'success', TRUE,
    'package_name', var_package_name,
    'restored_at', NOW()
  );

  RETURN var_return_data;
END;
$$;

-- RPC to permanently delete package
CREATE OR REPLACE FUNCTION public.admin_permanent_delete_mailbox_item(input_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  var_item_id UUID;
  var_package_name TEXT;
  var_return_data JSONB;
BEGIN
  var_item_id := (input_data->>'id')::UUID;

  -- Delete from mailroom_file_table first (due to FK)
  DELETE FROM public.mailroom_file_table WHERE mailbox_item_id = var_item_id;
  
  -- Delete from mail_action_request_table (due to FK)
  DELETE FROM public.mail_action_request_table WHERE mailbox_item_id = var_item_id;

  DELETE FROM public.mailbox_item_table
  WHERE mailbox_item_id = var_item_id
  RETURNING mailbox_item_name INTO var_package_name;

  IF var_package_name IS NULL THEN
    RAISE EXCEPTION 'Package not found';
  END IF;

  var_return_data := JSONB_BUILD_OBJECT(
    'success', TRUE,
    'package_name', var_package_name,
    'deleted_forever_at', NOW()
  );

  RETURN var_return_data;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_admin_archived_packages(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_restore_mailbox_item(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_permanent_delete_mailbox_item(JSONB) TO authenticated;
