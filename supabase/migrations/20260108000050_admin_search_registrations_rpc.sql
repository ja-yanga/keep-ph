-- Create RPC function to search mailroom registrations across multiple tables
CREATE OR REPLACE FUNCTION admin_search_mailroom_registrations(
    input_query TEXT,
    input_limit INTEGER DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    var_limit INTEGER := COALESCE(input_limit, 50);
    var_search_text TEXT := '%' || LOWER(TRIM(input_query)) || '%';
    return_data JSONB;
BEGIN
    SELECT JSONB_AGG(sub.item) INTO return_data
    FROM (
        SELECT JSONB_BUILD_OBJECT(
            'id', mrt.mailroom_registration_id,
            'full_name', COALESCE(
                NULLIF(TRIM(COALESCE(ukt.user_kyc_first_name, '') || ' ' || COALESCE(ukt.user_kyc_last_name, '')), ''),
                mlt.mailroom_location_name,
                'Unknown'
            ),
            'email', ut.users_email,
            'mobile', ut.mobile_number,
            'mailroom_code', mrt.mailroom_registration_code,
            'mailroom_plans', CASE 
                WHEN mpt.mailroom_plan_id IS NOT NULL THEN JSONB_BUILD_OBJECT(
                    'name', mpt.mailroom_plan_name,
                    'can_receive_mail', mpt.mailroom_plan_can_receive_mail,
                    'can_receive_parcels', mpt.mailroom_plan_can_receive_parcels
                )
                ELSE NULL
            END
        ) AS item
        FROM public.mailroom_registration_table mrt
        LEFT JOIN public.users_table ut ON mrt.user_id = ut.users_id
        LEFT JOIN public.user_kyc_table ukt ON mrt.user_id = ukt.user_id
        LEFT JOIN public.mailroom_location_table mlt ON mrt.mailroom_location_id = mlt.mailroom_location_id
        LEFT JOIN public.mailroom_plan_table mpt ON mrt.mailroom_plan_id = mpt.mailroom_plan_id
        WHERE (
            ut.users_email ILIKE var_search_text
            OR ukt.user_kyc_first_name ILIKE var_search_text
            OR ukt.user_kyc_last_name ILIKE var_search_text
            OR (COALESCE(ukt.user_kyc_first_name, '') || ' ' || COALESCE(ukt.user_kyc_last_name, '')) ILIKE var_search_text
            OR mrt.mailroom_registration_code ILIKE var_search_text
        )

        ORDER BY mrt.mailroom_registration_created_at DESC
        LIMIT var_limit
    ) sub;

    RETURN COALESCE(return_data, '[]'::JSONB);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION admin_search_mailroom_registrations(TEXT, INTEGER) TO authenticated, service_role;
