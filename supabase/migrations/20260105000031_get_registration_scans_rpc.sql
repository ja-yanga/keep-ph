-- Create RPC for user to fetch scans and usage for a specific registration
CREATE OR REPLACE FUNCTION get_registration_scans(input_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    var_user_id UUID;
    var_registration_id UUID;
    var_owner_id UUID;
    var_limit_mb NUMERIC := 0;
    var_used_mb NUMERIC := 0;
    var_scans JSONB := '[]'::JSONB;
    var_return_data JSONB;
BEGIN
    var_user_id := (input_data->>'user_id')::UUID;
    var_registration_id := (input_data->>'registration_id')::UUID;

    -- 1. Verify ownership and retrieve plan storage limit
    SELECT 
        mrt.user_id,
        COALESCE(mpt.mailroom_plan_storage_limit, 100)
    INTO 
        var_owner_id,
        var_limit_mb
    FROM mailroom_registration_table mrt
    JOIN mailroom_plan_table mpt ON mrt.mailroom_plan_id = mpt.mailroom_plan_id
    WHERE mrt.mailroom_registration_id = var_registration_id;

    IF var_owner_id IS NULL THEN
        RAISE EXCEPTION 'Registration not found';
    END IF;

    IF var_owner_id <> var_user_id THEN
        RAISE EXCEPTION 'You do not have permission to view these files';
    END IF;

    -- 2. Fetch scans and calculate total used storage for this registration
    WITH reg_files AS (
        SELECT 
            mft.mailroom_file_id,
            mft.mailbox_item_id,
            mft.mailroom_file_name,
            mft.mailroom_file_url,
            mft.mailroom_file_size_mb,
            mft.mailroom_file_mime_type,
            mft.mailroom_file_uploaded_at,
            mft.mailroom_file_type,
            JSONB_BUILD_OBJECT(
                'mailbox_item_id', mit.mailbox_item_id,
                'mailbox_item_name', mit.mailbox_item_name,
                'mailroom_registration_id', mit.mailroom_registration_id
            ) AS mailbox_item_table
        FROM mailroom_file_table mft
        JOIN mailbox_item_table mit ON mft.mailbox_item_id = mit.mailbox_item_id
        WHERE mit.mailroom_registration_id = var_registration_id
        ORDER BY mft.mailroom_file_uploaded_at DESC
    )
    SELECT 
        COALESCE(JSONB_AGG(rf), '[]'::JSONB),
        COALESCE(SUM(rf.mailroom_file_size_mb), 0)
    INTO var_scans, var_used_mb
    FROM reg_files rf;

    -- 3. Construct return data
    var_return_data := JSONB_BUILD_OBJECT(
        'scans', var_scans,
        'usage', JSONB_BUILD_OBJECT(
            'used_mb', var_used_mb,
            'limit_mb', var_limit_mb,
            'percentage', CASE 
                WHEN var_limit_mb > 0 THEN LEAST((var_used_mb / var_limit_mb) * 100, 100)
                ELSE 0
            END
        )
    );

    RETURN var_return_data;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_registration_scans(JSONB) TO authenticated;
