-- Create a function to get user notifications
CREATE OR REPLACE FUNCTION get_user_notifications(input_user_id UUID, input_limit INT DEFAULT 10)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    return_data JSONB;
BEGIN
    SELECT 
        jsonb_agg(notification_table)
    INTO 
        return_data
    FROM (
        SELECT 
            notification_table.*
        FROM notification_table
        WHERE user_id = input_user_id
        ORDER BY notification_created_at DESC
        LIMIT input_limit
    ) AS notification_table;

    RETURN COALESCE(return_data, '[]'::JSONB);
END;
$$;
