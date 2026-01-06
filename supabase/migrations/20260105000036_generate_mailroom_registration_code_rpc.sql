-- Create RPC for generating a unique mailroom registration code
CREATE OR REPLACE FUNCTION generate_mailroom_registration_code()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    var_mailroom_code TEXT;
    var_is_unique BOOLEAN := FALSE;
    var_attempts INTEGER := 0;
    var_random_str TEXT;
    var_return_data JSONB;
BEGIN
    WHILE NOT var_is_unique AND var_attempts < 10 LOOP
        -- Generate 6 random hex characters
        var_random_str := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
        var_mailroom_code := 'KPH-' || var_random_str;

        -- Check if code exists
        IF NOT EXISTS (
            SELECT 1 
            FROM mailroom_registration_table 
            WHERE mailroom_registration_code = var_mailroom_code
        ) THEN
            var_is_unique := TRUE;
        END IF;

        var_attempts := var_attempts + 1;
    END LOOP;

    IF NOT var_is_unique THEN
        RAISE EXCEPTION 'Failed to generate unique mailroom code';
    END IF;

    var_return_data := JSONB_BUILD_OBJECT(
        'code', var_mailroom_code
    );

    RETURN var_return_data;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION generate_mailroom_registration_code() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_mailroom_registration_code() TO service_role;
