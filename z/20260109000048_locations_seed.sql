-- Benchmark and Seeding for Mailroom Locations
-- This script inserts 1000 dummy locations into the mailroom_location_table for performance testing

DO $$
DECLARE
    i INT;
    region_val TEXT;
    city_val TEXT;
    prefix_val TEXT;
BEGIN
    FOR i IN 1..1000 LOOP
        -- Alternate regions and cities for better filtering variety
        IF i % 4 = 1 THEN
            region_val := 'NCR';
            city_val := 'Makati';
        ELSIF i % 4 = 2 THEN
            region_val := 'NCR';
            city_val := 'Quezon City';
        ELSIF i % 4 = 3 THEN
            region_val := 'Region IV-A';
            city_val := 'Antipolo';
        ELSE
            region_val := 'Region III';
            city_val := 'San Fernando';
        END IF;

        prefix_val := 'LOC-' || LPAD(i::TEXT, 4, '0');

        INSERT INTO public.mailroom_location_table (
            mailroom_location_name,
            mailroom_location_region,
            mailroom_location_city,
            mailroom_location_barangay,
            mailroom_location_zip,
            mailroom_location_total_lockers,
            mailroom_location_prefix
        ) VALUES (
            'Location ' || i || ' (' || city_val || ')',
            region_val,
            city_val,
            'Barangay ' || i,
            '1000',
            (RANDOM() * 100)::INT,
            prefix_val
        );
    END LOOP;
END $$;
