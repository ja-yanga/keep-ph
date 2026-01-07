-- RPC for getting assigned lockers for admin
CREATE OR REPLACE FUNCTION admin_get_assigned_lockers()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    var_return_data JSONB;
BEGIN
    SELECT JSONB_AGG(
        JSONB_BUILD_OBJECT(
            'id', malt.mailroom_assigned_locker_id,
            'registration_id', malt.mailroom_registration_id,
            'locker_id', malt.location_locker_id,
            'status', malt.mailroom_assigned_locker_status,
            'assigned_at', malt.mailroom_assigned_locker_assigned_at,
            'registration', JSONB_BUILD_OBJECT(
                'id', mrt.mailroom_registration_id,
                'user_id', mrt.user_id,
                'email', ut.users_email
            ),
            'locker', JSONB_BUILD_OBJECT(
                'id', llt.location_locker_id,
                'code', llt.location_locker_code,
                'is_available', llt.location_locker_is_available
            )
        )
    ) INTO var_return_data
    FROM mailroom_assigned_locker_table malt
    JOIN mailroom_registration_table mrt ON malt.mailroom_registration_id = mrt.mailroom_registration_id
    JOIN users_table ut ON mrt.user_id = ut.users_id
    JOIN location_locker_table llt ON malt.location_locker_id = llt.location_locker_id;

    RETURN COALESCE(var_return_data, '[]'::JSONB);
END;
$$;

-- RPC for creating an assigned locker for admin
CREATE OR REPLACE FUNCTION admin_create_assigned_locker(input_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    var_registration_id UUID;
    var_locker_id UUID;
    var_locker_available BOOLEAN;
    var_new_assignment_id UUID;
    var_return_data JSONB;
BEGIN
    var_registration_id := (input_data->>'registration_id')::UUID;
    var_locker_id := (input_data->>'locker_id')::UUID;

    -- 1. Check locker availability
    SELECT location_locker_is_available INTO var_locker_available
    FROM location_locker_table
    WHERE location_locker_id = var_locker_id
    FOR UPDATE; -- Lock the row for update

    IF var_locker_available IS NULL THEN
        RAISE EXCEPTION 'Locker not found';
    ELSIF var_locker_available = FALSE THEN
        RAISE EXCEPTION 'Locker is not available';
    END IF;

    -- 2. Create assignment
    INSERT INTO mailroom_assigned_locker_table (
        mailroom_registration_id,
        location_locker_id,
        mailroom_assigned_locker_status,
        mailroom_assigned_locker_assigned_at
    )
    VALUES (
        var_registration_id,
        var_locker_id,
        'Empty',
        NOW()
    )
    RETURNING mailroom_assigned_locker_id INTO var_new_assignment_id;

    -- 3. Mark locker unavailable
    UPDATE location_locker_table
    SET location_locker_is_available = FALSE
    WHERE location_locker_id = var_locker_id;

    -- 4. Return the new assignment with joined data
    SELECT JSONB_BUILD_OBJECT(
        'id', malt.mailroom_assigned_locker_id,
        'registration_id', malt.mailroom_registration_id,
        'locker_id', malt.location_locker_id,
        'status', malt.mailroom_assigned_locker_status,
        'assigned_at', malt.mailroom_assigned_locker_assigned_at,
        'locker', JSONB_BUILD_OBJECT(
            'location_locker_id', llt.location_locker_id,
            'location_locker_code', llt.location_locker_code
        ),
        'registration', JSONB_BUILD_OBJECT(
            'mailroom_registration_id', mrt.mailroom_registration_id,
            'user_id', mrt.user_id
        )
    ) INTO var_return_data
    FROM mailroom_assigned_locker_table malt
    JOIN location_locker_table llt ON malt.location_locker_id = llt.location_locker_id
    JOIN mailroom_registration_table mrt ON malt.mailroom_registration_id = mrt.mailroom_registration_id
    WHERE malt.mailroom_assigned_locker_id = var_new_assignment_id;

    RETURN var_return_data;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION admin_get_assigned_lockers() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_assigned_lockers() TO service_role;
GRANT EXECUTE ON FUNCTION admin_create_assigned_locker(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_create_assigned_locker(JSONB) TO service_role;
