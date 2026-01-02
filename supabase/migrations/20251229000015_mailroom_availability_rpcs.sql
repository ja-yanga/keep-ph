-- Create RPC for getting mailroom locations
CREATE OR REPLACE FUNCTION public.get_mailroom_locations(input_data JSON DEFAULT '{}'::JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
    return_data JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'id', mailroom_location_id,
            'name', mailroom_location_name,
            'region', mailroom_location_region,
            'city', mailroom_location_city,
            'barangay', mailroom_location_barangay,
            'zip', mailroom_location_zip
        )
    )
    INTO return_data
    FROM (
        SELECT 
            mailroom_location_id,
            mailroom_location_name,
            mailroom_location_region,
            mailroom_location_city,
            mailroom_location_barangay,
            mailroom_location_zip
        FROM public.mailroom_location_table
        ORDER BY mailroom_location_name ASC
    ) AS mailroom_location_table;

    RETURN COALESCE(return_data, '[]'::JSON);
END;
$$ LANGUAGE plpgsql;

-- Create RPC for getting location availability
CREATE OR REPLACE FUNCTION public.get_location_availability(input_data JSON DEFAULT '{}'::JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
    return_data JSON;
BEGIN
    SELECT json_object_agg(mailroom_location_id, locker_count)
    INTO return_data
    FROM (
        SELECT 
            mailroom_location_id,
            COUNT(*)::INTEGER as locker_count
        FROM public.location_locker_table
        WHERE location_locker_is_available = TRUE
        GROUP BY mailroom_location_id
    ) AS location_locker_counts;

    RETURN COALESCE(return_data, '{}'::JSON);
END;
$$ LANGUAGE plpgsql;
