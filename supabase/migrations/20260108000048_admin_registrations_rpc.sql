-- Create RPC function for consolidated admin mailroom registrations management

CREATE OR REPLACE FUNCTION admin_get_mailroom_registrations_consolidated()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    return_data JSONB;
BEGIN
    SELECT JSONB_BUILD_OBJECT(
        'registrations', COALESCE((
            SELECT JSONB_AGG(
                JSONB_BUILD_OBJECT(
                    'id', mrt.mailroom_registration_id,
                    'user_id', mrt.user_id,
                    'mailroom_code', mrt.mailroom_registration_code,
                    'mailroom_status', COALESCE(mrt.mailroom_registration_status, TRUE),
                    'created_at', mrt.mailroom_registration_created_at,
                    'location_id', mrt.mailroom_location_id,
                    'plan_id', mrt.mailroom_plan_id,
                    'email', ut.users_email,
                    'mobile', ut.mobile_number,
                    'kyc_first_name', ukt.user_kyc_first_name,
                    'kyc_last_name', ukt.user_kyc_last_name,
                    'full_name', CASE 
                        WHEN ukt.user_kyc_first_name IS NOT NULL OR ukt.user_kyc_last_name IS NOT NULL THEN
                            TRIM(COALESCE(ukt.user_kyc_first_name, '') || ' ' || COALESCE(ukt.user_kyc_last_name, ''))
                        ELSE SPLIT_PART(ut.users_email, '@', 1)
                    END,
                    'locker_qty', (
                        SELECT COUNT(*)
                        FROM public.mailroom_assigned_locker_table malt
                        WHERE malt.mailroom_registration_id = mrt.mailroom_registration_id
                    ),
                    'months', (
                        SELECT CASE 
                            WHEN st.subscription_billing_cycle::TEXT ILIKE 'MONTHLY' THEN 1
                            WHEN st.subscription_billing_cycle::TEXT ILIKE 'QUARTERLY' THEN 3
                            WHEN st.subscription_billing_cycle::TEXT ILIKE 'ANNUAL' THEN 12
                            WHEN st.subscription_started_at IS NOT NULL AND st.subscription_expires_at IS NOT NULL THEN
                                GREATEST(0, (EXTRACT(YEAR FROM st.subscription_expires_at) - EXTRACT(YEAR FROM st.subscription_started_at)) * 12 + EXTRACT(MONTH FROM st.subscription_expires_at) - EXTRACT(MONTH FROM st.subscription_started_at))
                            ELSE 0
                        END

                        FROM public.subscription_table st
                        WHERE st.mailroom_registration_id = mrt.mailroom_registration_id
                        LIMIT 1
                    )
                ) ORDER BY mrt.mailroom_registration_created_at DESC
            )
            FROM public.mailroom_registration_table mrt
            LEFT JOIN public.users_table ut ON mrt.user_id = ut.users_id
            LEFT JOIN public.user_kyc_table ukt ON mrt.user_id = ukt.user_id
        ), '[]'::JSONB),

        'lockers', COALESCE((
            SELECT JSONB_AGG(
                JSONB_BUILD_OBJECT(
                    'id', llt.location_locker_id,
                    'locker_code', llt.location_locker_code,
                    'is_available', COALESCE(llt.location_locker_is_available, TRUE),
                    'location_id', llt.mailroom_location_id,
                    'created_at', llt.location_locker_created_at
                )
            )
            FROM public.location_locker_table llt
            WHERE llt.location_locker_deleted_at IS NULL
        ), '[]'::JSONB),
        'assignedLockers', COALESCE((
            SELECT JSONB_AGG(
                JSONB_BUILD_OBJECT(
                    'id', malt.mailroom_assigned_locker_id,
                    'registration_id', malt.mailroom_registration_id,
                    'locker_id', malt.location_locker_id,
                    'status', COALESCE(malt.mailroom_assigned_locker_status, 'Empty'),
                    'assigned_at', malt.mailroom_assigned_locker_assigned_at
                )
            )
            FROM public.mailroom_assigned_locker_table malt
        ), '[]'::JSONB),
        'plans', COALESCE((
            SELECT JSONB_AGG(
                JSONB_BUILD_OBJECT(
                    'id', mpt.mailroom_plan_id,
                    'name', mpt.mailroom_plan_name,
                    'price', COALESCE(mpt.mailroom_plan_price, 0)
                )
            )
            FROM public.mailroom_plan_table mpt
        ), '[]'::JSONB),
        'locations', COALESCE((
            SELECT JSONB_AGG(
                JSONB_BUILD_OBJECT(
                    'id', mlt.mailroom_location_id,
                    'name', mlt.mailroom_location_name,
                    'region', mlt.mailroom_location_region,
                    'city', mlt.mailroom_location_city,
                    'barangay', mlt.mailroom_location_barangay,
                    'zip', mlt.mailroom_location_zip,
                    'total_lockers', COALESCE(mlt.mailroom_location_total_lockers, 0)
                )
            )
            FROM public.mailroom_location_table mlt
        ), '[]'::JSONB)
    ) INTO return_data;

    RETURN return_data;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION admin_get_mailroom_registrations_consolidated() TO authenticated, service_role;
