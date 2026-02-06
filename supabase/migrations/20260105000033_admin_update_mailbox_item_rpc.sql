-- Create RPC for admin to update a mailbox item and related data
CREATE OR REPLACE FUNCTION admin_update_mailbox_item(input_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    var_admin_id UUID;
    var_item_id UUID;
    var_mailbox_item_name TEXT;
    var_mailroom_registration_id UUID;
    var_location_locker_id UUID;
    var_mailroom_item_type TEXT;
    var_mailroom_item_status TEXT;
    var_mailbox_item_photo TEXT;
    var_location_locker_status TEXT;
    
    var_old_status TEXT;
    var_old_registration_id UUID;
    var_old_item_name TEXT;
    
    var_updated_item JSONB;
    return_data JSONB;
BEGIN
    var_admin_id := (input_data->>'user_id')::UUID;
    var_item_id := (input_data->>'id')::UUID;
    var_mailbox_item_name := input_data->>'mailbox_item_name';
    var_mailroom_registration_id := (input_data->>'mailroom_registration_id')::UUID;
    var_location_locker_id := (input_data->>'location_locker_id')::UUID;
    var_mailroom_item_type := input_data->>'mailroom_item_type';
    var_mailroom_item_status := input_data->>'mailroom_item_status';
    var_mailbox_item_photo := input_data->>'mailbox_item_photo';
    var_location_locker_status := input_data->>'location_locker_status';

    -- 1. Fetch existing item data
    SELECT 
        mailbox_item_status, 
        mailroom_registration_id, 
        mailbox_item_name
    INTO 
        var_old_status, 
        var_old_registration_id, 
        var_old_item_name
    FROM mailbox_item_table
    WHERE mailbox_item_id = var_item_id;

    IF var_old_item_name IS NULL THEN
        RAISE EXCEPTION 'Package not found';
    END IF;

    -- 2. Update mailbox_item_table
    UPDATE mailbox_item_table
    SET
        mailbox_item_name = COALESCE(var_mailbox_item_name, mailbox_item_name),
        mailroom_registration_id = COALESCE(var_mailroom_registration_id, mailroom_registration_id),
        location_locker_id = CASE WHEN (input_data ? 'location_locker_id') THEN var_location_locker_id ELSE location_locker_id END,
        mailbox_item_type = COALESCE(var_mailroom_item_type::mailroom_package_type, mailbox_item_type),
        mailbox_item_status = COALESCE(var_mailroom_item_status::mailroom_package_status, mailbox_item_status),
        mailbox_item_photo = CASE WHEN (input_data ? 'mailbox_item_photo') THEN var_mailbox_item_photo ELSE mailbox_item_photo END,
        mailbox_item_updated_at = NOW()
    WHERE mailbox_item_id = var_item_id
    RETURNING TO_JSONB(mailbox_item_table.*) INTO var_updated_item;

    -- 3. Update locker status if provided
    IF var_location_locker_status IS NOT NULL AND var_old_registration_id IS NOT NULL THEN
        UPDATE mailroom_assigned_locker_table
        SET mailroom_assigned_locker_status = var_location_locker_status::mailroom_assigned_locker_status
        WHERE mailroom_registration_id = var_old_registration_id;
    END IF;

    -- 4. Construct return data with embedded files
    SELECT 
      var_updated_item || jsonb_build_object(
        'mailroom_file_table', (
          SELECT json_agg(row_to_json(mft))
          FROM public.mailroom_file_table mft
          WHERE mft.mailbox_item_id = var_item_id
        )
      ) INTO var_updated_item;

    return_data := JSONB_BUILD_OBJECT(
        'ok', TRUE,
        'item', var_updated_item,
        'old_status', var_old_status,
        'old_registration_id', var_old_registration_id,
        'old_item_name', var_old_item_name
    );

    RETURN return_data;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION admin_update_mailbox_item(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_mailbox_item(JSONB) TO service_role;
