-- Create RPC for user to delete a storage file
CREATE OR REPLACE FUNCTION delete_user_storage_file(input_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    var_user_id UUID;
    var_file_id UUID;
    var_registration_id UUID;
    var_owner_id UUID;
    var_file_url TEXT;
    var_return_data JSONB;
BEGIN
    var_user_id := (input_data->>'user_id')::UUID;
    var_file_id := (input_data->>'file_id')::UUID;

    -- 1. Fetch file and its registration ID
    SELECT 
        mft.mailroom_file_url,
        mit.mailroom_registration_id
    INTO 
        var_file_url,
        var_registration_id
    FROM mailroom_file_table mft
    JOIN mailbox_item_table mit ON mft.mailbox_item_id = mit.mailbox_item_id
    WHERE mft.mailroom_file_id = var_file_id;

    IF var_file_url IS NULL THEN
        RAISE EXCEPTION 'Scan not found';
    END IF;

    -- 2. Verify ownership
    SELECT mrt.user_id INTO var_owner_id
    FROM mailroom_registration_table mrt
    WHERE mrt.mailroom_registration_id = var_registration_id;

    IF var_owner_id <> var_user_id THEN
        RAISE EXCEPTION 'Forbidden';
    END IF;

    -- 3. Delete from database
    DELETE FROM mailroom_file_table
    WHERE mailroom_file_id = var_file_id;

    -- 4. Construct return data (frontend needs file_url to delete from storage)
    var_return_data := JSONB_BUILD_OBJECT(
        'success', TRUE,
        'file_url', var_file_url
    );

    RETURN var_return_data;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION delete_user_storage_file(JSONB) TO authenticated;
