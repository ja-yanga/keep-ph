CREATE OR REPLACE FUNCTION update_mailroom_assigned_locker_status(
  input_id UUID,
  input_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  var_return_data JSONB;
BEGIN
  UPDATE mailroom_assigned_locker_table
  SET mailroom_assigned_locker_status = input_status
  WHERE mailroom_assigned_locker_id = input_id;

  var_return_data := JSONB_BUILD_OBJECT('success', TRUE);
  RETURN var_return_data;
END;
$$;

CREATE OR REPLACE FUNCTION delete_mailroom_assigned_locker(
  input_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  var_locker_id UUID;
  var_return_data JSONB;
BEGIN
  -- Get the associated locker ID before deletion
  SELECT location_locker_id INTO var_locker_id
  FROM mailroom_assigned_locker_table
  WHERE mailroom_assigned_locker_id = input_id;

  -- Delete the assignment
  DELETE FROM mailroom_assigned_locker_table
  WHERE mailroom_assigned_locker_id = input_id;

  -- If there was an associated locker, mark it as available
  IF var_locker_id IS NOT NULL THEN
    UPDATE location_locker_table
    SET location_locker_is_available = TRUE
    WHERE location_locker_id = var_locker_id;
  END IF;

  var_return_data := JSONB_BUILD_OBJECT('success', TRUE);
  RETURN var_return_data;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_mailroom_assigned_locker_status(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_mailroom_assigned_locker_status(UUID, TEXT) TO service_role;

GRANT EXECUTE ON FUNCTION delete_mailroom_assigned_locker(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_mailroom_assigned_locker(UUID) TO service_role;
