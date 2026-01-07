-- Create a function to get user notifications with pagination using limit/offset range style (Postgres .range() usage)
CREATE OR REPLACE FUNCTION get_user_notifications(
    input_user_id UUID, 
    input_limit INT DEFAULT 10, 
    input_offset INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$ 
DECLARE 
    return_data JSONB;
    from_idx INT; 
    to_idx INT; 
BEGIN 
    -- Postgres .range() translates to LIMIT (to_idx - from_idx + 1) OFFSET from_idx 
    from_idx := input_offset; 
    to_idx := input_offset + input_limit - 1;

    -- Main query to get notifications with pagination
    SELECT 
        jsonb_agg(n.*)
    INTO 
        return_data
    FROM (
        SELECT 
            notification_table.*  -- No need for aliasing here if you don't want it
        FROM notification_table
        WHERE notification_table.user_id = input_user_id
        ORDER BY notification_table.notification_created_at DESC
        OFFSET from_idx
        LIMIT (to_idx - from_idx + 1)
    ) AS n;  -- Ensure proper aliasing for subquery

    RETURN COALESCE(return_data, '[]'::JSONB);
END;
$$;
