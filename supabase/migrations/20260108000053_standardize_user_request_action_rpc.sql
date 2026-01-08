CREATE OR REPLACE FUNCTION public.user_request_mailbox_item_action(input_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    var_user_id UUID;
    var_mailbox_item_id UUID;
    var_status TEXT;
    var_selected_address_id UUID;
    var_notes JSONB;
    var_release_to_name TEXT;
    var_registration_id UUID;
    var_owner_id UUID;
    var_action_type TEXT;
    var_release_info JSONB := '{}'::JSONB;
    var_formatted_address TEXT;
    var_return_data JSONB;
BEGIN
    var_user_id := (input_data->>'user_id')::UUID;
    var_mailbox_item_id := (input_data->>'mailbox_item_id')::UUID;
    var_status := input_data->>'status';
    var_selected_address_id := (input_data->>'selected_address_id')::UUID;
    var_notes := COALESCE((input_data->>'notes')::JSONB, '{}'::JSONB);
    var_release_to_name := input_data->>'release_to_name';

    -- 1. Verify ownership
    SELECT mit.mailroom_registration_id INTO var_registration_id
    FROM public.mailbox_item_table mit
    WHERE mit.mailbox_item_id = var_mailbox_item_id;

    IF var_registration_id IS NULL THEN
        RETURN jsonb_build_object(
            'ok', false,
            'error', 'Mailbox item not found'
        );
    END IF;

    SELECT mrt.user_id INTO var_owner_id
    FROM public.mailroom_registration_table mrt
    WHERE mrt.mailroom_registration_id = var_registration_id;

    IF var_owner_id <> var_user_id THEN
        RETURN jsonb_build_object(
            'ok', false,
            'error', 'Forbidden'
        );
    END IF;

    -- 2. Handle status update
    IF var_status IS NOT NULL THEN
        IF var_status NOT IN ('STORED', 'RELEASED', 'RETRIEVED', 'DISPOSED', 'REQUEST_TO_RELEASE', 'REQUEST_TO_DISPOSE', 'REQUEST_TO_SCAN') THEN
            RETURN jsonb_build_object(
                'ok', false,
                'error', 'Invalid status'
            );
        END IF;

        UPDATE public.mailbox_item_table
        SET mailbox_item_status = var_status::public.mailroom_package_status,
            mailbox_item_updated_at = NOW()
        WHERE mailbox_item_id = var_mailbox_item_id;
    END IF;

    -- 3. Handle address selection
    IF input_data ? 'selected_address_id' THEN
        IF var_selected_address_id IS NOT NULL THEN
            SELECT 
                COALESCE(uat.user_address_label, '') || ', ' ||
                COALESCE(uat.user_address_line1, '') || ', ' ||
                COALESCE(uat.user_address_line2, '') || ', ' ||
                COALESCE(uat.user_address_city, '') || ', ' ||
                COALESCE(uat.user_address_region, '') || ', ' ||
                COALESCE(uat.user_address_postal::TEXT, '')
            INTO var_formatted_address
            FROM public.user_address_table uat
            WHERE uat.user_address_id = var_selected_address_id
            AND uat.user_id = var_user_id;

            IF var_formatted_address IS NULL THEN
                RETURN jsonb_build_object(
                    'ok', false,
                    'error', 'Address not found or unauthorized'
                );
            END IF;

            UPDATE public.mailbox_item_table
            SET user_address_id = var_selected_address_id,
                mailbox_item_release_address = var_formatted_address
            WHERE mailbox_item_id = var_mailbox_item_id;
            
            var_release_info := var_release_info || jsonb_build_object(
                'user_address_id', var_selected_address_id,
                'release_address', var_formatted_address
            );
        ELSE
            UPDATE public.mailbox_item_table
            SET user_address_id = NULL,
                mailbox_item_release_address = NULL
            WHERE mailbox_item_id = var_mailbox_item_id;
        END IF;
    END IF;

    -- 4. Create action request if needed
    var_action_type := CASE 
        WHEN var_status = 'REQUEST_TO_RELEASE' THEN 'RELEASE'
        WHEN var_status = 'REQUEST_TO_DISPOSE' THEN 'DISPOSE'
        WHEN var_status = 'REQUEST_TO_SCAN' THEN 'SCAN'
        ELSE NULL
    END;

    IF var_action_type IS NOT NULL THEN
        IF var_action_type = 'RELEASE' THEN
            -- Build release info for JSON storage
            IF var_notes ? 'pickup_on_behalf' AND (var_notes->'pickup_on_behalf')::BOOLEAN THEN
                var_release_info := var_release_info || jsonb_build_object(
                    'pickup_on_behalf', jsonb_build_object(
                        'name', var_notes->>'name',
                        'mobile', var_notes->>'mobile',
                        'contact_mode', var_notes->>'contact_mode'
                    )
                );
            END IF;

            IF var_release_to_name IS NOT NULL THEN
                var_release_info := var_release_info || jsonb_build_object('release_to_name', var_release_to_name);
            END IF;
        END IF;

        INSERT INTO public.mail_action_request_table (
            mailbox_item_id,
            user_id,
            mail_action_request_type,
            mail_action_request_status,
            mail_action_request_forward_address,
            mail_action_request_forward_tracking_number,
            mail_action_request_forward_3pl_name,
            mail_action_request_forward_tracking_url
        )
        VALUES (
            var_mailbox_item_id,
            var_user_id,
            var_action_type::public.mail_action_request_type,
            'PROCESSING',
            CASE 
                WHEN jsonb_array_length(jsonb_path_query_array(var_release_info, '$.*')) > 0 THEN var_release_info::TEXT 
                ELSE input_data->>'forward_address' 
            END,
            input_data->>'forward_tracking_number',
            input_data->>'forward_3pl_name',
            input_data->>'forward_tracking_url'
        );
    END IF;

    -- 5. Construct return data
    SELECT jsonb_build_object(
        'ok', true,
        'data', row_to_json(mit)::JSONB
    ) INTO var_return_data
    FROM public.mailbox_item_table mit
    WHERE mit.mailbox_item_id = var_mailbox_item_id;

    RETURN var_return_data;

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'ok', false,
        'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_request_mailbox_item_action(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_request_mailbox_item_action(JSONB) TO service_role;
