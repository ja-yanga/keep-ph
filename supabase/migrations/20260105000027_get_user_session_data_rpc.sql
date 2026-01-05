-- Create RPC for fetching user session data
CREATE OR REPLACE FUNCTION get_user_session_data(input_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    var_profile JSONB;
    var_kyc JSONB;
    var_return_data JSONB;
BEGIN
    -- 1. Fetch profile data from users_table
    SELECT jsonb_build_object(
        'users_id', ut.users_id,
        'users_email', ut.users_email,
        'users_role', ut.users_role,
        'users_avatar_url', ut.users_avatar_url,
        'users_referral_code', ut.users_referral_code,
        'users_is_verified', ut.users_is_verified,
        'mobile_number', ut.mobile_number
    )
    INTO var_profile
    FROM users_table ut
    WHERE ut.users_id = input_user_id;

    -- 2. Fetch KYC status
    -- Note: user_kyc table name based on route.ts line 58
    SELECT jsonb_build_object(
        'status', COALESCE(uk.user_kyc_status, 'SUBMITTED')
    )
    INTO var_kyc
    FROM user_kyc_table uk
    WHERE uk.user_id = input_user_id;

    -- 3. Construct return data
    var_return_data := jsonb_build_object(
        'profile', var_profile,
        'kyc', var_kyc,
        'role', var_profile->>'users_role'
    );

    RETURN var_return_data;
END;
$$;
