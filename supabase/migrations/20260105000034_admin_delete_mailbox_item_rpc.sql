-- Create RPC for admin to soft delete a mailbox item
CREATE OR REPLACE FUNCTION admin_delete_mailbox_item(input_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    var_admin_id UUID;
    var_item_id UUID;
    var_package_name TEXT;
    var_registration_id UUID;
    var_return_data JSONB;
BEGIN
    var_admin_id := (input_data->>'user_id')::UUID;
    var_item_id := (input_data->>'id')::UUID;

    -- 1. Fetch package details for logging
    SELECT 
        mailbox_item_name, 
        mailroom_registration_id
    INTO 
        var_package_name, 
        var_registration_id
    FROM mailbox_item_table
    WHERE mailbox_item_id = var_item_id;

    IF var_package_name IS NULL THEN
        RAISE EXCEPTION 'Package not found';
    END IF;

    -- 2. Soft delete: set deleted_at timestamp
    UPDATE mailbox_item_table
    SET mailbox_item_deleted_at = NOW()
    WHERE mailbox_item_id = var_item_id;

    -- 3. Construct return data
    var_return_data := JSONB_BUILD_OBJECT(
        'success', TRUE,
        'package_name', var_package_name,
        'registration_id', var_registration_id,
        'deleted_at', NOW()
    );

    RETURN var_return_data;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION admin_delete_mailbox_item(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_mailbox_item(JSONB) TO service_role;
