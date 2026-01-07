-- Create RPC for KYC submission
CREATE OR REPLACE FUNCTION user_submit_kyc(input_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    var_user_id UUID;
    var_kyc_id UUID;
    var_return_data JSONB;
BEGIN
    var_user_id := (input_data->>'user_id')::UUID;

    -- Upsert KYC record
    INSERT INTO user_kyc_table (
        user_id,
        user_kyc_status, 
        user_kyc_id_document_type,
        user_kyc_id_front_url,
        user_kyc_id_back_url,
        user_kyc_id_number,
        user_kyc_first_name,
        user_kyc_last_name,
        user_kyc_date_of_birth,
        user_kyc_agreements_accepted
    )
    VALUES (
        var_user_id,
        'SUBMITTED',
        input_data->>'document_type',
        input_data->>'id_front_url',
        input_data->>'id_back_url',
        input_data->>'user_kyc_id_number',
        input_data->>'first_name',
        input_data->>'last_name',
        (input_data->>'birth_date')::DATE,
        TRUE
    )
    ON CONFLICT (user_id) DO UPDATE SET
        user_kyc_status = EXCLUDED.user_kyc_status,
        user_kyc_id_document_type = EXCLUDED.user_kyc_id_document_type,
        user_kyc_id_front_url = EXCLUDED.user_kyc_id_front_url,
        user_kyc_id_back_url = EXCLUDED.user_kyc_id_back_url,
        user_kyc_id_number = EXCLUDED.user_kyc_id_number,
        user_kyc_first_name = EXCLUDED.user_kyc_first_name,
        user_kyc_last_name = EXCLUDED.user_kyc_last_name,
        user_kyc_date_of_birth = EXCLUDED.user_kyc_date_of_birth,
        user_kyc_agreements_accepted = EXCLUDED.user_kyc_agreements_accepted
    RETURNING user_kyc_id INTO var_kyc_id;

    -- Insert address if provided
    IF input_data->>'address_line1' IS NOT NULL AND input_data->>'address_line1' <> '' THEN
        INSERT INTO user_kyc_address_table (
            user_kyc_id,
            user_kyc_address_line_one,
            user_kyc_address_line_two,
            user_kyc_address_city,
            user_kyc_address_region,
            user_kyc_address_postal_code,
            user_kyc_address_is_default
        )
        VALUES (
            var_kyc_id,
            input_data->>'address_line1',
            input_data->>'address_line2',
            input_data->>'city',
            input_data->>'region',
            (input_data->>'postal')::INTEGER,
            TRUE
        );
    END IF;

    var_return_data := jsonb_build_object(
        'ok', TRUE,
        'status', 'SUBMITTED',
        'user_kyc_id', var_kyc_id
    );

    RETURN var_return_data;
END;
$$;
