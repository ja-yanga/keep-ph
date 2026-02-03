-- Create RPC to update a mailroom location and generate lockers if total increases
DROP FUNCTION IF EXISTS public.rpc_update_mailroom_location(
    p_id UUID,
    p_name TEXT,
    p_code TEXT,
    p_region TEXT,
    p_city TEXT,
    p_barangay TEXT,
    p_zip TEXT,
    p_total_lockers INT,
    p_is_hidden BOOLEAN,
    p_max_locker_limit INT
);

CREATE OR REPLACE FUNCTION public.rpc_update_mailroom_location(
    p_id UUID,
    p_name TEXT DEFAULT NULL,
    p_code TEXT DEFAULT NULL,
    p_region TEXT DEFAULT NULL,
    p_city TEXT DEFAULT NULL,
    p_barangay TEXT DEFAULT NULL,
    p_zip TEXT DEFAULT NULL,
    p_total_lockers INT DEFAULT NULL,
    p_is_hidden BOOLEAN DEFAULT NULL,
    p_max_locker_limit INT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    code TEXT,
    region TEXT,
    city TEXT,
    barangay TEXT,
    zip TEXT,
    total_lockers INT,
    is_hidden BOOLEAN,
    max_locker_limit INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    v_old_total INT;
    v_new_total INT;
    v_prefix TEXT;
    i INT;
BEGIN
    IF p_id IS NULL THEN
        RAISE EXCEPTION 'Missing id parameter';
    END IF;

    SELECT
        l.mailroom_location_total_lockers,
        l.mailroom_location_prefix
    INTO
        v_old_total,
        v_prefix
    FROM public.mailroom_location_table l
    WHERE l.mailroom_location_id = p_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Location not found';
    END IF;

    v_new_total := COALESCE(p_total_lockers, v_old_total);

    UPDATE public.mailroom_location_table
    SET
        mailroom_location_name = COALESCE(p_name, mailroom_location_name),
        mailroom_location_prefix = COALESCE(p_code, mailroom_location_prefix),
        mailroom_location_region = COALESCE(p_region, mailroom_location_region),
        mailroom_location_city = COALESCE(p_city, mailroom_location_city),
        mailroom_location_barangay = COALESCE(p_barangay, mailroom_location_barangay),
        mailroom_location_zip = COALESCE(p_zip, mailroom_location_zip),
        mailroom_location_total_lockers = COALESCE(p_total_lockers, mailroom_location_total_lockers),
        mailroom_location_is_hidden = COALESCE(p_is_hidden, mailroom_location_is_hidden),
        mailroom_location_max_locker_limit = COALESCE(p_max_locker_limit, mailroom_location_max_locker_limit)
    WHERE mailroom_location_id = p_id;

    -- Create new lockers if total increases
    IF v_new_total > v_old_total THEN
        v_prefix := COALESCE(p_code, v_prefix);
        v_prefix := COALESCE(v_prefix, 'L');
        FOR i IN (v_old_total + 1)..v_new_total LOOP
            INSERT INTO public.location_locker_table (
                mailroom_location_id,
                location_locker_code,
                location_locker_is_available
            ) VALUES (
                p_id,
                v_prefix || '-' || lpad(i::text, 3, '0'),
                TRUE
            );
        END LOOP;
    END IF;

    RETURN QUERY
    SELECT
        l.mailroom_location_id,
        l.mailroom_location_name,
        l.mailroom_location_prefix,
        l.mailroom_location_region,
        l.mailroom_location_city,
        l.mailroom_location_barangay,
        l.mailroom_location_zip,
        l.mailroom_location_total_lockers,
        l.mailroom_location_is_hidden,
        l.mailroom_location_max_locker_limit
    FROM public.mailroom_location_table l
    WHERE l.mailroom_location_id = p_id;
END;
$$;