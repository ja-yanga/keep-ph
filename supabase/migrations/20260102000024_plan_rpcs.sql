-- Create a function to list all mailroom plans
CREATE OR REPLACE FUNCTION get_mailroom_plans()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    return_data JSONB;
BEGIN
    SELECT 
        jsonb_agg(mailroom_plan_table)
    INTO 
        return_data
    FROM (
        SELECT 
            mailroom_plan_id,
            mailroom_plan_name,
            mailroom_plan_price,
            mailroom_plan_description,
            mailroom_plan_storage_limit,
            mailroom_plan_can_receive_mail,
            mailroom_plan_can_receive_parcels,
            mailroom_plan_can_digitize
        FROM mailroom_plan_table
        ORDER BY mailroom_plan_price ASC
    ) AS mailroom_plan_table;

    RETURN COALESCE(return_data, '[]'::JSONB);
END;
$$;
