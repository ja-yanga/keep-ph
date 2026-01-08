CREATE OR REPLACE FUNCTION admin_update_mailroom_location(input_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    var_id UUID := (input_data->>'id')::UUID;
    var_name TEXT := input_data->>'name';
    var_prefix TEXT := input_data->>'code';
    var_region TEXT := input_data->>'region';
    var_city TEXT := input_data->>'city';
    var_barangay TEXT := input_data->>'barangay';
    var_zip TEXT := input_data->>'zip';
    var_total_lockers INTEGER := (input_data->>'total_lockers')::INTEGER;
    
    var_old_total INTEGER;
    var_active_prefix TEXT;
    var_prefix_stripped TEXT;
    var_lockers_to_create JSONB[] := '{}';
    var_updated_row RECORD;
    return_data JSONB;
BEGIN
    -- 1. Fetch current totals and prefix
    SELECT 
        mailroom_location_total_lockers, 
        mailroom_location_prefix
    INTO 
        var_old_total, 
        var_active_prefix
    FROM public.mailroom_location_table
    WHERE mailroom_location_id = var_id;

    IF var_old_total IS NULL THEN
        RAISE EXCEPTION 'Location not found';
    END IF;

    -- 2. Determine which prefix to use for new lockers
    IF var_prefix IS NOT NULL THEN
        var_active_prefix := var_prefix;
    END IF;

    -- 3. Update the location
    UPDATE public.mailroom_location_table
    SET
        mailroom_location_name = COALESCE(var_name, mailroom_location_name),
        mailroom_location_prefix = CASE WHEN (input_data ? 'code') THEN var_prefix ELSE mailroom_location_prefix END,
        mailroom_location_region = CASE WHEN (input_data ? 'region') THEN var_region ELSE mailroom_location_region END,
        mailroom_location_city = CASE WHEN (input_data ? 'city') THEN var_city ELSE mailroom_location_city END,
        mailroom_location_barangay = CASE WHEN (input_data ? 'barangay') THEN var_barangay ELSE mailroom_location_barangay END,
        mailroom_location_zip = CASE WHEN (input_data ? 'zip') THEN var_zip ELSE mailroom_location_zip END,
        mailroom_location_total_lockers = COALESCE(var_total_lockers, mailroom_location_total_lockers)
    WHERE mailroom_location_id = var_id

    RETURNING * INTO var_updated_row;

    -- 4. Handle locker generation if count increased
    IF var_total_lockers IS NOT NULL AND var_total_lockers > var_old_total THEN
        var_prefix_stripped := CASE WHEN var_active_prefix IS NOT NULL THEN var_active_prefix || '-' ELSE 'L' END;
        
        FOR i IN (var_old_total + 1)..var_total_lockers LOOP
            INSERT INTO public.location_locker_table (
                mailroom_location_id,
                location_locker_code,
                location_locker_is_available
            ) VALUES (
                var_id,
                var_prefix_stripped || LPAD(i::TEXT, 3, '0'),
                TRUE
            );
        END LOOP;
    END IF;

    -- 5. Construct return data
    return_data := JSONB_BUILD_OBJECT(
        'message', 'Location updated',
        'data', JSONB_BUILD_OBJECT(
            'id', var_updated_row.mailroom_location_id,
            'name', var_updated_row.mailroom_location_name,
            'code', var_updated_row.mailroom_location_prefix,
            'region', var_updated_row.mailroom_location_region,
            'city', var_updated_row.mailroom_location_city,
            'barangay', var_updated_row.mailroom_location_barangay,
            'zip', var_updated_row.mailroom_location_zip,
            'total_lockers', var_updated_row.mailroom_location_total_lockers
        )
    );

    RETURN return_data;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION admin_update_mailroom_location(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_mailroom_location(JSONB) TO service_role;
