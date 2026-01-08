CREATE OR REPLACE FUNCTION public.admin_process_mailroom_scan(
    input_package_id UUID,
    input_file_name TEXT,
    input_file_url TEXT,
    input_file_size_mb NUMERIC,
    input_file_mime_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    var_user_id UUID;
    var_reg_id UUID;
    var_pkg_name TEXT;
    return_data JSONB;
BEGIN
    -- 1. Get package and registration info
    SELECT 
        mit.mailbox_item_name,
        mit.mailroom_registration_id,
        mrt.user_id
    INTO var_pkg_name, var_reg_id, var_user_id
    FROM public.mailbox_item_table mit
    JOIN public.mailroom_registration_table mrt ON mrt.mailroom_registration_id = mit.mailroom_registration_id
    WHERE mit.mailbox_item_id = input_package_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'ok', false,
            'error', 'Package not found'
        );
    END IF;

    -- 2. Insert scan record
    INSERT INTO public.mailroom_file_table (
        mailbox_item_id,
        mailroom_file_name,
        mailroom_file_url,
        mailroom_file_size_mb,
        mailroom_file_mime_type,
        mailroom_file_type
    )
    VALUES (
        input_package_id,
        input_file_name,
        input_file_url,
        input_file_size_mb,
        input_file_mime_type,
        'SCANNED'
    );

    -- 3. Update package status
    -- We keep it as REQUEST_TO_SCAN or update to STORED/SCANNED if needed.
    -- Usually, once scanned it's still STORED but with a scan available.
    -- Some flows might update status to 'SCANNED'.
    UPDATE public.mailbox_item_table
    SET mailbox_item_updated_at = NOW()
    WHERE mailbox_item_id = input_package_id;

    -- 4. Mark action request as COMPLETED
    UPDATE public.mail_action_request_table
    SET mail_action_request_status = 'COMPLETED',
        mail_action_request_completed_at = NOW()
    WHERE mailbox_item_id = input_package_id
    AND mail_action_request_type = 'SCAN'
    AND mail_action_request_status = 'PROCESSING';

    -- 5. Return success data for notification
    RETURN jsonb_build_object(
        'ok', true,
        'data', jsonb_build_object(
            'user_id', var_user_id,
            'mailroom_registration_id', var_reg_id,
            'mailbox_item_name', var_pkg_name
        )
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'ok', false,
        'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_process_mailroom_scan(UUID, TEXT, TEXT, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_process_mailroom_scan(UUID, TEXT, TEXT, NUMERIC, TEXT) TO service_role;
