-- Update get_admin_mailroom_packages to include mailroom_file_table
CREATE OR REPLACE FUNCTION public.get_admin_mailroom_packages(
  input_limit INTEGER DEFAULT 50,
  input_offset INTEGER DEFAULT 0,
  input_compact BOOLEAN DEFAULT false
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  result JSON;
  packages_json JSON;
  registrations_json JSON;
  lockers_json JSON;
  assigned_lockers_json JSON;
  total_count INTEGER;
BEGIN
  -- Get total count of packages (excluding soft-deleted)
  SELECT COUNT(*) INTO total_count
  FROM public.mailbox_item_table
  WHERE mailbox_item_deleted_at IS NULL;

  -- Get packages (mailbox items) with pagination
  WITH paginated_items AS (
    SELECT 
      mi.mailbox_item_id,
      mi.mailbox_item_name,
      mi.mailroom_registration_id,
      mi.location_locker_id,
      mi.mailbox_item_type,
      mi.mailbox_item_status,
      mi.mailbox_item_photo,
      mi.mailbox_item_release_address,
      mi.user_address_id,
      mi.mailbox_item_received_at,
      mi.mailbox_item_created_at,
      mi.mailbox_item_updated_at,
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
    WHERE mi.mailbox_item_deleted_at IS NULL
    ORDER BY mi.mailbox_item_received_at DESC NULLS LAST
    LIMIT input_limit
    OFFSET input_offset
  )
  SELECT COALESCE(
    JSON_AGG(
      JSON_BUILD_OBJECT(
        'id', pi.mailbox_item_id,
        'package_name', pi.mailbox_item_name,
        'registration_id', pi.mailroom_registration_id,
        'locker_id', pi.location_locker_id,
        'package_type', pi.mailbox_item_type,
        'status', pi.mailbox_item_status,
        'package_photo', pi.mailbox_item_photo,
        'release_address', pi.mailbox_item_release_address,
        'release_address_id', pi.user_address_id,
        'received_at', pi.mailbox_item_received_at,
        'mailbox_item_created_at', pi.mailbox_item_created_at,
        'mailbox_item_updated_at', pi.mailbox_item_updated_at,
        'mailroom_file_table', (
          SELECT JSON_AGG(ROW_TO_JSON(mft))
          FROM public.mailroom_file_table mft
          WHERE mft.mailbox_item_id = pi.mailbox_item_id
        ),
        'registration', CASE
          WHEN pi.reg_id IS NOT NULL THEN JSON_BUILD_OBJECT(
            'id', pi.reg_id,
            'full_name', COALESCE(
              CONCAT_WS(' ', pi.user_kyc_first_name, pi.user_kyc_last_name),
              pi.mailroom_location_name,
              'Unknown'
            ),
            'email', pi.users_email,
            'mobile', pi.mobile_number,
            'mailroom_code', pi.mailroom_registration_code,
            'mailroom_plans', CASE
              WHEN pi.mailroom_plan_id IS NOT NULL THEN JSON_BUILD_OBJECT(
                'name', pi.mailroom_plan_name,
                'can_receive_mail', pi.mailroom_plan_can_receive_mail,
                'can_receive_parcels', pi.mailroom_plan_can_receive_parcels
              )
              ELSE NULL
            END
          )
          ELSE NULL
        END,
        'locker', CASE
          WHEN pi.locker_id IS NOT NULL THEN JSON_BUILD_OBJECT(
            'id', pi.locker_id,
            'locker_code', pi.location_locker_code
          )
          ELSE NULL
        END
      )
    ),
    '[]'::JSON
  )
  INTO packages_json
  FROM paginated_items pi;

  -- Get registrations
  SELECT COALESCE(
    JSON_AGG(
      JSON_BUILD_OBJECT(
        'id', mr.mailroom_registration_id,
        'full_name', COALESCE(
          CONCAT_WS(' ', uk.user_kyc_first_name, uk.user_kyc_last_name),
          ml.mailroom_location_name,
          'Unknown'
        ),
        'email', u.users_email,
        'mobile', u.mobile_number,
        'mailroom_code', mr.mailroom_registration_code,
        'mailroom_plans', CASE
          WHEN p.mailroom_plan_id IS NOT NULL THEN JSON_BUILD_OBJECT(
            'name', p.mailroom_plan_name,
            'can_receive_mail', p.mailroom_plan_can_receive_mail,
            'can_receive_parcels', p.mailroom_plan_can_receive_parcels
          )
          ELSE NULL
        END
      )
    ),
    '[]'::JSON
  )
  INTO registrations_json
  FROM public.mailroom_registration_table mr
  LEFT JOIN public.users_table u ON u.users_id = mr.user_id
  LEFT JOIN public.user_kyc_table uk ON uk.user_id = u.users_id
  LEFT JOIN public.mailroom_location_table ml ON ml.mailroom_location_id = mr.mailroom_location_id
  LEFT JOIN public.mailroom_plan_table p ON p.mailroom_plan_id = mr.mailroom_plan_id;

  -- Get lockers
  SELECT COALESCE(
    JSON_AGG(
      JSON_BUILD_OBJECT(
        'id', ll.location_locker_id,
        'locker_code', ll.location_locker_code,
        'is_available', ll.location_locker_is_available
      )
    ),
    '[]'::JSON
  )
  INTO lockers_json
  FROM public.location_locker_table ll;

  -- Get assigned lockers
  SELECT COALESCE(
    JSON_AGG(
      JSON_BUILD_OBJECT(
        'id', mal.mailroom_assigned_locker_id,
        'registration_id', mal.mailroom_registration_id,
        'locker_id', mal.location_locker_id,
        'status', mal.mailroom_assigned_locker_status,
        'locker', CASE
          WHEN ll.location_locker_id IS NOT NULL THEN JSON_BUILD_OBJECT(
            'id', ll.location_locker_id,
            'locker_code', ll.location_locker_code
          )
          ELSE NULL
        END
      )
    ),
    '[]'::JSON
  )
  INTO assigned_lockers_json
  FROM public.mailroom_assigned_locker_table mal
  LEFT JOIN public.location_locker_table ll ON ll.location_locker_id = mal.location_locker_id;

  -- Build final result
  result := JSON_BUILD_OBJECT(
    'packages', packages_json,
    'registrations', registrations_json,
    'lockers', lockers_json,
    'assignedLockers', assigned_lockers_json,
    'total_count', total_count
  );

  RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_admin_mailroom_packages(INTEGER, INTEGER, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_mailroom_packages(INTEGER, INTEGER, BOOLEAN) TO anon;
