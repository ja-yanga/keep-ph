-- 1. check_locker_availability
CREATE OR REPLACE FUNCTION check_locker_availability(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
    -- Input variables
    input_location_id UUID := (input_data->>'location_id')::UUID;
    input_locker_qty INTEGER := (input_data->>'locker_qty')::INTEGER;
    
    -- Function variables
    var_available_count INTEGER;
    
    -- Return variable
    return_data JSON;
BEGIN
    SELECT COUNT(*)::INTEGER
    INTO var_available_count
    FROM (
        SELECT location_locker_id
        FROM public.location_locker_table AS location_locker
        WHERE location_locker.mailroom_location_id = input_location_id
          AND location_locker.location_locker_is_available = TRUE
        LIMIT input_locker_qty
    ) AS subquery;

    return_data := json_build_object(
        'available', var_available_count >= input_locker_qty,
        'count', var_available_count
    );

    RETURN return_data;
END;
$$ LANGUAGE plpgsql;

-- 2. calculate_registration_amount
CREATE OR REPLACE FUNCTION calculate_registration_amount(input_data JSON)
RETURNS NUMERIC
SET search_path TO ''
AS $$
DECLARE
    -- Input variables
    input_plan_id UUID := (input_data->>'plan_id')::UUID;
    input_locker_qty INTEGER := (input_data->>'locker_qty')::INTEGER;
    input_months INTEGER := (input_data->>'months')::INTEGER;
    input_referral_code TEXT := COALESCE((input_data->>'referral_code')::TEXT, NULL);
    
    -- Function variables
    var_plan_price NUMERIC;
    var_referrer_exists BOOLEAN := FALSE;
    
    -- Return variable
    return_data NUMERIC;
BEGIN
    -- Fetch Plan Price
    SELECT mailroom_plan_price
    INTO var_plan_price
    FROM public.mailroom_plan_table AS mailroom_plan
    WHERE mailroom_plan.mailroom_plan_id = input_plan_id;

    IF var_plan_price IS NULL THEN
        RAISE EXCEPTION 'Invalid plan selected';
    END IF;

    -- Calculate base amount
    return_data := var_plan_price * input_locker_qty * input_months;

    -- Apply yearly discount
    IF input_months = 12 THEN
        return_data := return_data * 0.8;
    END IF;

    -- Apply referral discount
    IF input_referral_code IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 
            FROM public.users_table AS users
            WHERE users.users_referral_code = input_referral_code
        ) INTO var_referrer_exists;

        IF var_referrer_exists THEN
            return_data := return_data * 0.95;
        END IF;
    END IF;

    RETURN return_data;
END;
$$ LANGUAGE plpgsql;

-- 3. create_mailroom_registration
CREATE OR REPLACE FUNCTION create_mailroom_registration(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
    -- Input variables
    input_user_id UUID := (input_data->>'user_id')::UUID;
    input_location_id UUID := (input_data->>'location_id')::UUID;
    input_plan_id UUID := (input_data->>'plan_id')::UUID;
    input_locker_qty INTEGER := (input_data->>'locker_qty')::INTEGER;
    input_mailroom_code TEXT := (input_data->>'mailroom_code')::TEXT;
    
    -- Function variables
    var_registration_id UUID;
    var_locker_ids UUID[];
    var_registration_record RECORD;
    
    -- Return variable
    return_data JSON;
BEGIN
    -- 1. Create registration
    INSERT INTO public.mailroom_registration_table (
        user_id,
        mailroom_location_id,
        mailroom_plan_id,
        mailroom_registration_code,
        mailroom_registration_status
    )
    VALUES (
        input_user_id,
        input_location_id,
        input_plan_id,
        input_mailroom_code,
        TRUE
    )
    RETURNING mailroom_registration_id INTO var_registration_id;

    -- 2. Get available lockers
    var_locker_ids := ARRAY(
        SELECT location_locker_id
        FROM public.location_locker_table AS location_locker
        WHERE location_locker.mailroom_location_id = input_location_id
          AND location_locker.location_locker_is_available = TRUE
        LIMIT input_locker_qty
        FOR UPDATE
    );

    IF array_length(var_locker_ids, 1) < input_locker_qty THEN
        RAISE EXCEPTION 'Insufficient lockers available';
    END IF;

    -- 3. Mark lockers as unavailable
    UPDATE public.location_locker_table AS location_locker
    SET location_locker_is_available = FALSE
    WHERE location_locker.location_locker_id = ANY(var_locker_ids);

    -- 4. Create assignment records
    INSERT INTO public.mailroom_assigned_locker_table (
        mailroom_registration_id,
        location_locker_id,
        mailroom_assigned_locker_status
    )
    SELECT 
        var_registration_id,
        locker_id,
        'Normal'
    FROM unnest(var_locker_ids) AS locker_id;

    -- 5. Fetch the registration record for return
    SELECT * INTO var_registration_record 
    FROM public.mailroom_registration_table 
    WHERE mailroom_registration_id = var_registration_id;

    return_data := json_build_object(
        'registration', row_to_json(var_registration_record),
        'lockerIds', var_locker_ids
    );

    RETURN return_data;
END;
$$ LANGUAGE plpgsql;
