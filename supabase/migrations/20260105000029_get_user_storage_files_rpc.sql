-- Create RPC for user to fetch storage files and usage stats
CREATE OR REPLACE FUNCTION get_user_storage_files(input_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    var_total_limit_mb NUMERIC := 0;
    var_total_used_mb NUMERIC := 0;
    var_scans JSONB := '[]'::JSONB;
    var_return_data JSONB;
BEGIN
    -- 1. Calculate total storage limit across all user registrations
    SELECT COALESCE(SUM(mpt.mailroom_plan_storage_limit), 0)
    INTO var_total_limit_mb
    FROM mailroom_registration_table mrt
    JOIN mailroom_plan_table mpt ON mrt.mailroom_plan_id = mpt.mailroom_plan_id
    WHERE mrt.user_id = input_user_id;

    -- 2. Fetch scans and calculate total used storage
    WITH user_mailbox_items AS (
        SELECT mit.mailbox_item_id, mit.mailbox_item_name
        FROM mailbox_item_table mit
        JOIN mailroom_registration_table mrt ON mit.mailroom_registration_id = mrt.mailroom_registration_id
        WHERE mrt.user_id = input_user_id
    ),
    user_files AS (
        SELECT 
            mft.mailroom_file_id AS id,
            mft.mailroom_file_name AS file_name,
            mft.mailroom_file_url AS file_url,
            mft.mailroom_file_size_mb AS file_size_mb,
            mft.mailroom_file_mime_type AS mime_type,
            mft.mailroom_file_uploaded_at AS uploaded_at,
            mft.mailbox_item_id AS package_id,
            JSONB_BUILD_OBJECT(
                'id', umi.mailbox_item_id,
                'package_name', umi.mailbox_item_name
            ) AS package
        FROM mailroom_file_table mft
        JOIN user_mailbox_items umi ON mft.mailbox_item_id = umi.mailbox_item_id
        ORDER BY mft.mailroom_file_uploaded_at DESC
    )
    SELECT 
        COALESCE(JSONB_AGG(uf), '[]'::JSONB),
        COALESCE(SUM(uf.file_size_mb), 0)
    INTO var_scans, var_total_used_mb
    FROM user_files uf;

    -- 3. Construct return data
    var_return_data := JSONB_BUILD_OBJECT(
        'scans', var_scans,
        'usage', JSONB_BUILD_OBJECT(
            'used_mb', var_total_used_mb,
            'limit_mb', var_total_limit_mb,
            'percentage', CASE 
                WHEN var_total_limit_mb > 0 THEN LEAST((var_total_used_mb / var_total_limit_mb) * 100, 100)
                ELSE 0
            END
        )
    );

    RETURN var_return_data;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_storage_files(UUID) TO authenticated;
