-- Create RPC to safely create notifications
CREATE OR REPLACE FUNCTION create_notification(input_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    var_user_id UUID;
    var_title TEXT;
    var_message TEXT;
    var_type TEXT;
    var_link TEXT;
    var_return_data JSONB;
BEGIN
    var_user_id := (input_data->>'user_id')::UUID;
    var_title := input_data->>'title';
    var_message := input_data->>'message';
    var_type := input_data->>'type';
    var_link := input_data->>'link';

    -- Insert the notification
    INSERT INTO notification_table (
        user_id,
        notification_title,
        notification_message,
        notification_type,
        notification_link,
        notification_is_read
    )
    VALUES (
        var_user_id,
        var_title,
        var_message,
        var_type::notification_type,
        var_link,
        FALSE
    );

    var_return_data := JSONB_BUILD_OBJECT('success', TRUE);
    RETURN var_return_data;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_notification(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification(JSONB) TO service_role;
