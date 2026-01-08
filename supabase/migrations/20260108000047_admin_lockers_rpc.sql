-- Create RPC functions for admin mailroom lockers management

-- 1. Get all lockers with location and assignment info
CREATE OR REPLACE FUNCTION admin_get_mailroom_lockers()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    return_data JSONB;
BEGIN
    SELECT JSONB_AGG(
        JSONB_BUILD_OBJECT(
            'id', llt.location_locker_id,
            'location_id', llt.mailroom_location_id,
            'code', llt.location_locker_code,
            'is_available', llt.location_locker_is_available,
            'created_at', llt.location_locker_created_at,
            'location', CASE 
                WHEN mlt.mailroom_location_id IS NOT NULL THEN JSONB_BUILD_OBJECT(
                    'id', mlt.mailroom_location_id,
                    'name', mlt.mailroom_location_name
                )
                ELSE NULL
            END,
            'assigned', (
                SELECT JSONB_BUILD_OBJECT(
                    'id', malt.mailroom_assigned_locker_id,
                    'registration_id', malt.mailroom_registration_id,
                    'status', malt.mailroom_assigned_locker_status
                )
                FROM public.mailroom_assigned_locker_table malt
                WHERE malt.location_locker_id = llt.location_locker_id
                LIMIT 1
            ),
            'is_assigned', (
                EXISTS (
                    SELECT 1 
                    FROM public.mailroom_assigned_locker_table malt 
                    WHERE malt.location_locker_id = llt.location_locker_id
                ) OR llt.location_locker_is_available = FALSE
            )
        ) ORDER BY llt.location_locker_created_at DESC
    ) INTO return_data
    FROM public.location_locker_table llt
    LEFT JOIN public.mailroom_location_table mlt ON llt.mailroom_location_id = mlt.mailroom_location_id
    WHERE llt.location_locker_deleted_at IS NULL;

    RETURN COALESCE(return_data, '[]'::JSONB);
END;
$$;

-- 2. Create a new locker
CREATE OR REPLACE FUNCTION admin_create_mailroom_locker(input_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    var_location_id UUID := (input_data->>'location_id')::UUID;
    var_locker_code TEXT := input_data->>'locker_code';
    var_is_available BOOLEAN := COALESCE((input_data->>'is_available')::BOOLEAN, TRUE);
    var_new_locker RECORD;
    return_data JSONB;
BEGIN
    -- Insert locker
    INSERT INTO public.location_locker_table (
        mailroom_location_id,
        location_locker_code,
        location_locker_is_available
    ) VALUES (
        var_location_id,
        var_locker_code,
        var_is_available
    ) RETURNING * INTO var_new_locker;

    -- Update total_lockers
    UPDATE public.mailroom_location_table
    SET mailroom_location_total_lockers = COALESCE(mailroom_location_total_lockers, 0) + 1
    WHERE mailroom_location_id = var_location_id;

    return_data := JSONB_BUILD_OBJECT(
        'data', JSONB_BUILD_OBJECT(
            'id', var_new_locker.location_locker_id,
            'code', var_new_locker.location_locker_code
        )
    );

    RETURN return_data;
END;
$$;

-- 3. Update an existing locker
CREATE OR REPLACE FUNCTION admin_update_mailroom_locker(input_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    var_id UUID := (input_data->>'id')::UUID;
    var_code TEXT := input_data->>'locker_code';
    var_is_available BOOLEAN := (input_data->>'is_available')::BOOLEAN;
    var_location_id UUID := (input_data->>'location_id')::UUID;
    
    var_original_location_id UUID;
    var_updated_locker RECORD;
    return_data JSONB;
BEGIN
    -- Get original location
    SELECT mailroom_location_id INTO var_original_location_id
    FROM public.location_locker_table
    WHERE location_locker_id = var_id;

    IF var_original_location_id IS NULL THEN
        RAISE EXCEPTION 'Locker not found';
    END IF;

    -- Update locker
    UPDATE public.location_locker_table
    SET
        location_locker_code = COALESCE(var_code, location_locker_code),
        location_locker_is_available = CASE WHEN (input_data ? 'is_available') THEN var_is_available ELSE location_locker_is_available END,
        mailroom_location_id = COALESCE(var_location_id, mailroom_location_id)
    WHERE location_locker_id = var_id

    RETURNING * INTO var_updated_locker;

    -- Adjust location counters if location changed
    IF var_location_id IS NOT NULL AND var_location_id != var_original_location_id THEN
        -- Decrement old
        IF var_original_location_id IS NOT NULL THEN
            UPDATE public.mailroom_location_table
            SET mailroom_location_total_lockers = GREATEST(0, COALESCE(mailroom_location_total_lockers, 0) - 1)
            WHERE mailroom_location_id = var_original_location_id;
        END IF;

        -- Increment new
        UPDATE public.mailroom_location_table
        SET mailroom_location_total_lockers = COALESCE(mailroom_location_total_lockers, 0) + 1
        WHERE mailroom_location_id = var_location_id;
    END IF;

    return_data := JSONB_BUILD_OBJECT(
        'data', JSONB_BUILD_OBJECT(
            'id', var_updated_locker.location_locker_id,
            'location_id', var_updated_locker.mailroom_location_id,
            'code', var_updated_locker.location_locker_code,
            'is_available', var_updated_locker.location_locker_is_available
        )
    );

    RETURN return_data;
END;
$$;

-- 4. Delete a locker (soft delete)
CREATE OR REPLACE FUNCTION admin_delete_mailroom_locker(input_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    var_location_id UUID;
    return_data JSONB;
BEGIN
    -- Get location id
    SELECT mailroom_location_id INTO var_location_id
    FROM public.location_locker_table
    WHERE location_locker_id = input_id;

    -- Soft delete
    UPDATE public.location_locker_table
    SET location_locker_deleted_at = NOW()
    WHERE location_locker_id = input_id;

    -- Decrement total_lockers
    IF var_location_id IS NOT NULL THEN
        UPDATE public.mailroom_location_table
        SET mailroom_location_total_lockers = GREATEST(0, COALESCE(mailroom_location_total_lockers, 0) - 1)
        WHERE mailroom_location_id = var_location_id;
    END IF;

    return_data := JSONB_BUILD_OBJECT(
        'message', 'Locker deleted'
    );

    RETURN return_data;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION admin_get_mailroom_lockers() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION admin_create_mailroom_locker(JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION admin_update_mailroom_locker(JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION admin_delete_mailroom_locker(UUID) TO authenticated, service_role;
