-- Create RPC function to generate multiple mailroom lockers atomically
CREATE OR REPLACE FUNCTION admin_generate_mailroom_lockers(
    input_location_id UUID,
    input_total_to_add INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    var_prefix TEXT;
    var_current_total INTEGER;
    var_start_index INTEGER;
    var_end_index INTEGER;
    var_code_prefix TEXT;
    var_created_lockers JSONB := '[]'::JSONB;
    var_new_locker RECORD;
    return_data JSONB;
BEGIN
    -- 1. Fetch location prefix and current count
    SELECT 
        mailroom_location_prefix, 
        COALESCE(mailroom_location_total_lockers, 0)
    INTO 
        var_prefix, 
        var_current_total
    FROM public.mailroom_location_table
    WHERE mailroom_location_id = input_location_id;

    IF NOT FOUND THEN
        RETURN JSONB_BUILD_OBJECT('ok', FALSE, 'error', 'Location not found');
    END IF;

    -- 2. Define indices
    var_start_index := var_current_total + 1;
    var_end_index := var_current_total + input_total_to_add;
    var_code_prefix := CASE 
        WHEN var_prefix IS NOT NULL AND TRIM(var_prefix) <> '' THEN TRIM(var_prefix) || '-'
        ELSE 'L-'
    END;

    -- 3. Loop and insert lockers
    FOR i IN var_start_index..var_end_index LOOP
        INSERT INTO public.location_locker_table (
            mailroom_location_id,
            location_locker_code,
            location_locker_is_available
        ) VALUES (
            input_location_id,
            var_code_prefix || i::TEXT,
            TRUE
        ) RETURNING location_locker_id, location_locker_code INTO var_new_locker;

        var_created_lockers := var_created_lockers || JSONB_BUILD_OBJECT(
            'id', var_new_locker.location_locker_id,
            'code', var_new_locker.location_locker_code
        );
    END LOOP;

    -- 4. Update location total
    UPDATE public.mailroom_location_table
    SET mailroom_location_total_lockers = var_end_index
    WHERE mailroom_location_id = input_location_id;

    -- 5. Build return object
    return_data := JSONB_BUILD_OBJECT(
        'ok', TRUE,
        'message', 'Lockers generated',
        'data', JSONB_BUILD_OBJECT(
            'location_id', input_location_id,
            'created_count', input_total_to_add,
            'created_lockers', var_created_lockers,
            'total_lockers', var_end_index
        )
    );

    RETURN return_data;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION admin_generate_mailroom_lockers(UUID, INTEGER) TO authenticated, service_role;
