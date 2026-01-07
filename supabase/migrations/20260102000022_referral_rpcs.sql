-- Referral RPC Functions

-- 1. Add Referral
CREATE OR REPLACE FUNCTION public.referral_add(input_data JSONB)
RETURNS JSONB
SET search_path TO ''
AS $$
DECLARE
    input_user_id UUID := (input_data->>'user_id')::UUID;
    input_referral_code TEXT := (input_data->>'referral_code')::TEXT;
    input_referred_email TEXT := (input_data->>'referred_email')::TEXT;
    input_service_type TEXT := (input_data->>'service_type')::TEXT;
    
    var_referrer_id UUID;
    var_referred_id UUID;
BEGIN
    -- Resolve referrer
    IF input_referral_code IS NOT NULL THEN
        SELECT users_id INTO var_referrer_id
        FROM public.users_table
        WHERE users_referral_code = input_referral_code;
        
        IF var_referrer_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'message', 'Invalid referral code');
        END IF;
    ELSE
        var_referrer_id := input_user_id;
    END IF;

    IF var_referrer_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Could not resolve referrer');
    END IF;

    -- Resolve referred user
    SELECT users_id INTO var_referred_id
    FROM public.users_table
    WHERE users_email = input_referred_email;

    -- Insert referral
    INSERT INTO public.referral_table (
        referral_referrer_user_id,
        referral_referred_user_id,
        referral_service_type
    ) VALUES (
        var_referrer_id,
        var_referred_id,
        input_service_type
    );

    RETURN jsonb_build_object('success', true, 'message', 'Referral added');
END;
$$ LANGUAGE plpgsql;

-- 2. Generate Referral Code
CREATE OR REPLACE FUNCTION public.referral_generate(input_data JSONB)
RETURNS JSONB
SET search_path TO ''
AS $$
DECLARE
    input_user_id UUID := (input_data->>'user_id')::UUID;
    var_existing_code TEXT;
    var_new_code TEXT;
BEGIN
    -- Check existing
    SELECT users_referral_code INTO var_existing_code
    FROM public.users_table
    WHERE users_id = input_user_id;

    IF var_existing_code IS NOT NULL THEN
        RETURN jsonb_build_object('success', true, 'referral_code', var_existing_code);
    END IF;

    -- Generate new code (simplified for SQL)
    var_new_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8));

    UPDATE public.users_table
    SET users_referral_code = var_new_code
    WHERE users_id = input_user_id;

    RETURN jsonb_build_object('success', true, 'referral_code', var_new_code);
END;
$$ LANGUAGE plpgsql;

-- 3. List Referrals
CREATE OR REPLACE FUNCTION public.referral_list(input_data JSONB)
RETURNS JSONB
SET search_path TO ''
AS $$
DECLARE
    input_user_id UUID := (input_data->>'user_id')::UUID;
    var_referrals JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'referral_id', r.referral_id,
            'referral_referrer_user_id', r.referral_referrer_user_id,
            'referral_referred_user_id', r.referral_referred_user_id,
            'referral_service_type', r.referral_service_type,
            'referral_date_created', r.referral_date_created,
            'referred_email', u.users_email
        )
    ) INTO var_referrals
    FROM public.referral_table r
    LEFT JOIN public.users_table u ON r.referral_referred_user_id = u.users_id
    WHERE r.referral_referrer_user_id = input_user_id 
       OR r.referral_referred_user_id = input_user_id;

    RETURN jsonb_build_object('success', true, 'referrals', COALESCE(var_referrals, '[]'::jsonb));
END;
$$ LANGUAGE plpgsql;

-- 4. Validate Referral Code
CREATE OR REPLACE FUNCTION public.referral_validate(input_data JSONB)
RETURNS JSONB
SET search_path TO ''
AS $$
DECLARE
    input_code TEXT := (input_data->>'code')::TEXT;
    input_current_user_id UUID := (input_data->>'current_user_id')::UUID;
    var_referrer_id UUID;
BEGIN
    IF input_code IS NULL THEN
        RETURN jsonb_build_object('valid', false, 'message', 'Code is required');
    END IF;

    SELECT users_id INTO var_referrer_id
    FROM public.users_table
    WHERE users_referral_code = input_code;

    IF var_referrer_id IS NULL THEN
        RETURN jsonb_build_object('valid', false, 'message', 'Invalid referral code');
    END IF;

    IF input_current_user_id IS NOT NULL AND var_referrer_id = input_current_user_id THEN
        RETURN jsonb_build_object('valid', false, 'message', 'Cannot use your own code');
    END IF;

    RETURN jsonb_build_object('valid', true, 'message', 'Code applied: 5% Off');
END;
$$ LANGUAGE plpgsql;
