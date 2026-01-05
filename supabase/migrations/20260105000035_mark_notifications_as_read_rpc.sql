-- Create RPC to mark all unread notifications as read for a specific user
CREATE OR REPLACE FUNCTION mark_notifications_as_read(input_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    var_return_data JSONB;
BEGIN
    UPDATE notification_table
    SET notification_is_read = TRUE
    WHERE user_id = input_user_id
      AND notification_is_read = FALSE;

    var_return_data := JSONB_BUILD_OBJECT('success', TRUE);
    RETURN var_return_data;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION mark_notifications_as_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notifications_as_read(UUID) TO service_role;
