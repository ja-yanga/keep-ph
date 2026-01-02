-- Create RPC for finalizing registration from payment webhook
DROP FUNCTION IF EXISTS public.finalize_registration_from_payment(JSON);
DROP FUNCTION IF EXISTS public.finalize_registration_from_payment(JSONB);

CREATE OR REPLACE FUNCTION public.finalize_registration_from_payment(input_data JSONB)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
    -- Input variables
    input_payment_id TEXT := (input_data->>'payment_id')::TEXT;
    input_order_id TEXT := (input_data->>'order_id')::TEXT;
    input_user_id UUID := (input_data->>'user_id')::UUID;
    input_location_id UUID := (input_data->>'location_id')::UUID;
    input_plan_id UUID := (input_data->>'plan_id')::UUID;
    input_locker_qty INTEGER := COALESCE((input_data->>'locker_qty')::INTEGER, 1);
    input_months INTEGER := COALESCE((input_data->>'months')::INTEGER, 1);
    input_amount NUMERIC := COALESCE((input_data->>'amount')::NUMERIC, 0);
    
    -- Function variables
    var_existing_registration_id UUID;
    var_available_locker_ids UUID[];
    var_mailroom_code TEXT;
    var_is_unique BOOLEAN;
    var_attempts INTEGER;
    var_registration_id UUID;
    var_expires_at TIMESTAMPTZ;
    var_amount_decimal NUMERIC;
    
BEGIN
    -- 1) Check if payment transaction already exists (idempotency)
    SELECT mailroom_registration_id
    INTO var_existing_registration_id
    FROM public.payment_transaction_table
    WHERE payment_transaction_order_id = input_order_id
    ORDER BY payment_transaction_created_at DESC
    LIMIT 1;

    IF var_existing_registration_id IS NOT NULL THEN
        -- Check if registration exists and is active
        IF EXISTS (
            SELECT 1 FROM public.mailroom_registration_table
            WHERE mailroom_registration_id = var_existing_registration_id
            AND mailroom_registration_status = TRUE
        ) THEN
            RETURN json_build_object(
                'success', TRUE,
                'message', 'Registration already finalized',
                'registration_id', var_existing_registration_id
            );
        END IF;
    END IF;

    -- 2) Check available lockers
    SELECT ARRAY(
        SELECT location_locker_id
        FROM public.location_locker_table
        WHERE mailroom_location_id = input_location_id
          AND location_locker_is_available = TRUE
        LIMIT input_locker_qty
    ) INTO var_available_locker_ids;

    -- Check if we have enough lockers
    IF array_length(var_available_locker_ids, 1) IS NULL OR array_length(var_available_locker_ids, 1) < input_locker_qty THEN
        RETURN json_build_object(
            'success', FALSE,
            'message', 'Insufficient lockers available',
            'available_count', COALESCE(array_length(var_available_locker_ids, 1), 0),
            'needed', input_locker_qty
        );
    END IF;

    -- 3) Generate unique mailroom code
    var_is_unique := FALSE;
    var_attempts := 0;
    WHILE var_is_unique = FALSE AND var_attempts < 10 LOOP
        var_mailroom_code := 'KPH-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 4));
        
        SELECT NOT EXISTS (
            SELECT 1 FROM public.mailroom_registration_table
            WHERE mailroom_registration_code = var_mailroom_code
        ) INTO var_is_unique;
        
        var_attempts := var_attempts + 1;
    END LOOP;

    IF NOT var_is_unique THEN
        RETURN json_build_object(
            'success', FALSE,
            'message', 'Failed to generate unique mailroom code'
        );
    END IF;

    -- 4) Create registration
    INSERT INTO public.mailroom_registration_table (
        user_id,
        mailroom_location_id,
        mailroom_plan_id,
        mailroom_registration_code,
        mailroom_registration_status
    ) VALUES (
        input_user_id,
        input_location_id,
        input_plan_id,
        var_mailroom_code,
        TRUE
    )
    RETURNING mailroom_registration_id INTO var_registration_id;

    -- 5) Create subscription
    var_expires_at := NOW() + (input_months || ' months')::INTERVAL;

    INSERT INTO public.subscription_table (
        mailroom_registration_id,
        subscription_billing_cycle,
        subscription_expires_at
    ) VALUES (
        var_registration_id,
        (CASE WHEN input_months >= 12 THEN 'ANNUAL' ELSE 'MONTHLY' END)::public.billing_cycle,
        var_expires_at
    );

    -- 6) Create payment transaction
    var_amount_decimal := input_amount / 100.0;

    INSERT INTO public.payment_transaction_table (
        mailroom_registration_id,
        payment_transaction_amount,
        payment_transaction_status,
        payment_transaction_type,
        payment_transaction_reference_id,
        payment_transaction_order_id
    ) VALUES (
        var_registration_id,
        var_amount_decimal,
        'PAID'::public.payment_status,
        'SUBSCRIPTION'::public.payment_type,
        input_payment_id,
        input_order_id
    );

    -- 7) Assign lockers
    UPDATE public.location_locker_table
    SET location_locker_is_available = FALSE
    WHERE location_locker_id = ANY(var_available_locker_ids);

    INSERT INTO public.mailroom_assigned_locker_table (
        mailroom_registration_id,
        location_locker_id,
        mailroom_assigned_locker_status
    )
    SELECT var_registration_id, unnest(var_available_locker_ids), 'Normal'::public.mailroom_assigned_locker_status;

    RETURN json_build_object(
        'success', TRUE,
        'message', 'Registration finalized successfully',
        'registration_id', var_registration_id,
        'mailroom_code', var_mailroom_code
    );
END;
$$ LANGUAGE plpgsql;
