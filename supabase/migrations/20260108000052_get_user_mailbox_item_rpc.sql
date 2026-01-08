CREATE OR REPLACE FUNCTION public.get_user_mailbox_item(
    input_package_id UUID,
    input_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    var_reg_id UUID;
    var_owner_id UUID;
    return_data JSONB;
BEGIN
    -- 1. Get registration ID and verify owner
    SELECT mailroom_registration_id INTO var_reg_id
    FROM public.mailbox_item_table
    WHERE mailbox_item_id = input_package_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'ok', false,
            'error', 'Mailbox item not found'
        );
    END IF;

    SELECT user_id INTO var_owner_id
    FROM public.mailroom_registration_table
    WHERE mailroom_registration_id = var_reg_id;

    IF var_owner_id <> input_user_id THEN
        RETURN jsonb_build_object(
            'ok', false,
            'error', 'Forbidden'
        );
    END IF;

    -- 2. Fetch full item details
    SELECT jsonb_build_object(
        'ok', true,
        'data', (
            SELECT jsonb_build_object(
                'id', mit.mailbox_item_id,
                'mailbox_item_name', mit.mailbox_item_name,
                'mailbox_item_type', mit.mailbox_item_type,
                'mailbox_item_status', mit.mailbox_item_status,
                'mailbox_item_photo', mit.mailbox_item_photo,
                'mailbox_item_received_at', mit.mailbox_item_received_at,
                'mailbox_item_created_at', mit.mailbox_item_created_at,
                'mailbox_item_updated_at', mit.mailbox_item_updated_at,
                'location_locker_id', mit.location_locker_id,
                'user_address_id', mit.user_address_id,
                'mailbox_item_release_address', mit.mailbox_item_release_address,
                'locker', (
                    SELECT jsonb_build_object(
                        'id', ll.location_locker_id,
                        'locker_code', ll.location_locker_code
                    )
                    FROM public.location_locker_table ll
                    WHERE ll.location_locker_id = mit.location_locker_id
                ),
                'mailroom_file_table', (
                    SELECT jsonb_agg(row_to_json(mft))
                    FROM public.mailroom_file_table mft
                    WHERE mft.mailbox_item_id = mit.mailbox_item_id
                )
            )
            FROM public.mailbox_item_table mit
            WHERE mit.mailbox_item_id = input_package_id
        )
    ) INTO return_data;

    RETURN return_data;

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'ok', false,
        'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_mailbox_item(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_mailbox_item(UUID, UUID) TO service_role;
