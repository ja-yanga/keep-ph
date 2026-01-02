-- Create RPC for looking up mailroom registration by order ID
CREATE OR REPLACE FUNCTION public.get_mailroom_registration_by_order(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
    -- Input variables
    input_order_id TEXT := (input_data->>'order_id')::TEXT;
    
    -- Function variables
    var_registration_id UUID;
    return_data JSON;
BEGIN
    -- 1. Find the registration ID from the payment transaction
    SELECT payment_transaction.mailroom_registration_id
    INTO var_registration_id
    FROM public.payment_transaction_table AS payment_transaction
    WHERE payment_transaction.payment_transaction_order_id = input_order_id
    ORDER BY payment_transaction.payment_transaction_created_at DESC
    LIMIT 1;

    -- 2. If found, get the full registration record
    IF var_registration_id IS NOT NULL THEN
        SELECT row_to_json(mailroom_registration)
        INTO return_data
        FROM public.mailroom_registration_table AS mailroom_registration
        WHERE mailroom_registration.mailroom_registration_id = var_registration_id;
    END IF;

    RETURN return_data;
END;
$$ LANGUAGE plpgsql;
