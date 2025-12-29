-- Gets registration
CREATE OR REPLACE FUNCTION get_user_mailroom_registration(input_data JSON)
RETURNS JSON
SET search_path TO ''
SECURITY DEFINER
AS $$
DECLARE
  input_user_id UUID := (input_data->>'input_user_id')::UUID;
  input_registration_id UUID := (input_data->>'input_registration_id')::UUID;
  return_data JSON;
BEGIN
  SELECT row_to_json(t) INTO return_data
  FROM (
    SELECT
      mrt.mailroom_registration_id,
      mrt.user_id,
      mrt.mailroom_location_id,
      mrt.mailroom_plan_id,
      mrt.mailroom_registration_code,
      mrt.mailroom_registration_status,
      mrt.mailroom_registration_created_at,
      mrt.mailroom_registration_updated_at,
      row_to_json(mpt) as mailroom_plan_table,
      row_to_json(mlt) as mailroom_location_table,
      json_build_object(
        'users_id', ut.users_id,
        'users_email', ut.users_email,
        'users_phone', ut.mobile_number,
        'users_referral_code', ut.users_referral_code,
        'user_kyc_table', row_to_json(ukt)
      ) as users_table,
      COALESCE(json_agg(row_to_json(mit)) FILTER (WHERE mit.mailbox_item_id IS NOT NULL), '[]') as mailbox_item_table,
      row_to_json(st) as subscription_table
    FROM public.mailroom_registration_table mrt
    LEFT JOIN public.mailroom_plan_table mpt ON mrt.mailroom_plan_id = mpt.mailroom_plan_id
    LEFT JOIN public.mailroom_location_table mlt ON mrt.mailroom_location_id = mlt.mailroom_location_id
    LEFT JOIN public.users_table ut ON mrt.user_id = ut.users_id
    LEFT JOIN public.user_kyc_table ukt ON ut.users_id = ukt.user_id
    LEFT JOIN public.mailbox_item_table mit ON mrt.mailroom_registration_id = mit.mailroom_registration_id
    LEFT JOIN public.subscription_table st ON mrt.mailroom_registration_id = st.mailroom_registration_id
    WHERE mrt.mailroom_registration_id = input_registration_id
      AND mrt.user_id = input_user_id
    GROUP BY 
      mrt.mailroom_registration_id, 
      mpt.mailroom_plan_id, 
      mlt.mailroom_location_id, 
      ut.users_id, 
      ukt.user_kyc_id, 
      st.subscription_id
  ) t;
  RETURN return_data;
END;
$$ LANGUAGE plpgsql;

-- Gets assigned locker
CREATE OR REPLACE FUNCTION get_user_assigned_lockers(input_data JSON)
RETURNS JSON
SET search_path TO ''
SECURITY DEFINER
AS $$
DECLARE
  input_registration_id UUID := (input_data->>'input_registration_id')::UUID;
  return_data JSON;
BEGIN
  SELECT json_agg(row_to_json(t)) INTO return_data
  FROM (
    SELECT
      malt.*,
      row_to_json(llt) as location_locker_table
    FROM public.mailroom_assigned_locker_table malt
    LEFT JOIN public.location_locker_table llt ON malt.location_locker_id = llt.location_locker_id
    WHERE malt.mailroom_registration_id = input_registration_id
  ) t;
  RETURN return_data;
END;
$$ LANGUAGE plpgsql;

-- Gets mailbox items
CREATE OR REPLACE FUNCTION get_user_mailbox_items_by_registrations(input_data JSON)
RETURNS JSON
SET search_path TO ''
SECURITY DEFINER
AS $$
DECLARE
  input_registration_ids UUID[] := (
    SELECT array_agg(value::text::uuid)
    FROM json_array_elements_text(input_data->'input_registration_ids') AS value
  );
  return_data JSON;
BEGIN
  SELECT json_agg(row_to_json(t)) INTO return_data
  FROM (
    SELECT
      mit.mailroom_registration_id,
      mit.mailbox_item_status
    FROM public.mailbox_item_table mit
    WHERE mit.mailroom_registration_id = ANY(input_registration_ids)
  ) t;
  RETURN return_data;
END;
$$ LANGUAGE plpgsql;

-- Cancel Renewal
CREATE OR REPLACE FUNCTION cancel_user_mailroom_subscription(input_registration_id UUID)
RETURNS BOOLEAN
SET search_path TO ''
SECURITY DEFINER
AS $$
DECLARE
  return_data BOOLEAN;
BEGIN
  UPDATE subscription_table
  SET subscription_auto_renew = FALSE
  WHERE mailroom_registration_id = input_registration_id;

  IF FOUND THEN
    return_data := TRUE;
  ELSE
    return_data := FALSE;
  END IF;

  RETURN return_data;
END;
$$ LANGUAGE plpgsql;
