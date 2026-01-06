-- Create RPC to get user mailroom registration stats
CREATE OR REPLACE FUNCTION get_user_mailroom_registrations_stat(input_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    return_data JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'mailroom_registration_id', stats.mailroom_registration_id,
            'stored', stats.stored,
            'pending', stats.pending,
            'released', stats.released
        )
    )
    INTO return_data
    FROM (
        SELECT 
            mit.mailroom_registration_id,
            COUNT(*) FILTER (
                WHERE mit.mailbox_item_status::TEXT NOT IN ('RELEASED', 'RETRIEVED', 'DISPOSED')
                OR mit.mailbox_item_status::TEXT IN ('REQUEST_TO_SCAN', 'REQUEST_TO_RELEASE', 'REQUEST_TO_DISPOSE')
            ) AS stored,
            COUNT(*) FILTER (
                WHERE mit.mailbox_item_status::TEXT LIKE 'REQUEST%'
            ) AS pending,
            COUNT(*) FILTER (
                WHERE mit.mailbox_item_status::TEXT = 'RELEASED'
            ) AS released
        FROM mailbox_item_table mit
        JOIN mailroom_registration_table mrt ON mit.mailroom_registration_id = mrt.mailroom_registration_id
        WHERE mrt.user_id = input_user_id
        AND mit.mailbox_item_deleted_at IS NULL
        GROUP BY mit.mailroom_registration_id
    ) stats;

    RETURN COALESCE(return_data, '[]'::JSONB);
END;
$$;
