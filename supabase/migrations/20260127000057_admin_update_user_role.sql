CREATE OR REPLACE FUNCTION public.admin_update_user_role(
  input_target_user_id UUID,
  input_new_role TEXT,
  input_actor_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  actor_role TEXT;
  current_target_role TEXT;
  normalized_role TEXT;
  allowed_roles TEXT[];
BEGIN
  -- Normalize role
  normalized_role := LOWER(BTRIM(input_new_role));

  -- Validate role
  IF normalized_role NOT IN ('owner', 'admin', 'approver', 'user') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid role value');
  END IF;

  -- Get actor role
  SELECT users_role INTO actor_role
  FROM public.users_table
  WHERE users_id = input_actor_user_id;

  IF actor_role IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Actor role not found');
  END IF;

  actor_role := LOWER(actor_role);

  -- Get current target role
  SELECT users_role INTO current_target_role
  FROM public.users_table
  WHERE users_id = input_target_user_id;

  IF current_target_role IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Target user not found');
  END IF;

  current_target_role := LOWER(current_target_role);

  -- Only owner can assign owner
  IF normalized_role = 'owner' AND actor_role != 'owner' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Only owner can assign owner role');
  END IF;

  -- Prevent admin from modifying an owner
  IF current_target_role = 'owner' AND actor_role != 'owner' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Only owner can update another owner');
  END IF;

  -- Check allowed roles by actor
  IF actor_role = 'owner' THEN
    allowed_roles := ARRAY['owner', 'admin', 'approver', 'user'];
  ELSIF actor_role = 'admin' THEN
    allowed_roles := ARRAY['approver', 'user'];
  ELSE
    RETURN jsonb_build_object('ok', false, 'error', 'Forbidden: insufficient permissions');
  END IF;

  IF NOT (normalized_role = ANY(allowed_roles)) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Forbidden: role not allowed to assign this role');
  END IF;

  -- If owner transfers owner role, demote self to admin
  IF normalized_role = 'owner' AND actor_role = 'owner' AND input_actor_user_id != input_target_user_id THEN
    UPDATE public.users_table
    SET users_role = 'admin'
    WHERE users_id = input_actor_user_id;

    -- Update auth.users metadata for actor
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{role}',
      '"admin"',
      true
    )
    WHERE id = input_actor_user_id;
  END IF;

  -- Update target user role
  UPDATE public.users_table
  SET users_role = normalized_role
  WHERE users_id = input_target_user_id;

  -- Update auth.users metadata for target
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    to_jsonb(normalized_role),
    true
  )
  WHERE id = input_target_user_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;