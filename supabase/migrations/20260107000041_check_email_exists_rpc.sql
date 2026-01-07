CREATE OR REPLACE FUNCTION check_email_exists(p_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM users_table
        WHERE users_email = p_email
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 
