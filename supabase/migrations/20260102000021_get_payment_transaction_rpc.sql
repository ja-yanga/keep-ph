-- Create RPC for looking up payment transaction by order ID
CREATE OR REPLACE FUNCTION public.get_payment_transaction_by_order(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
    -- Input variables
    input_order_id TEXT := (input_data->>'order_id')::TEXT;
    
    -- Return variable
    return_data JSON;
BEGIN
    SELECT json_build_object(
        'payment_transaction_id', payment_transaction.payment_transaction_id,
        'payment_transaction_amount', payment_transaction.payment_transaction_amount,
        'payment_transaction_status', payment_transaction.payment_transaction_status,
        'payment_transaction_reference_id', payment_transaction.payment_transaction_reference_id,
        'payment_transaction_order_id', payment_transaction.payment_transaction_order_id,
        'payment_transaction_created_at', payment_transaction.payment_transaction_created_at,
        'mailroom_registration_id', payment_transaction.mailroom_registration_id
    )
    INTO return_data
    FROM public.payment_transaction_table AS payment_transaction
    WHERE payment_transaction.payment_transaction_order_id = input_order_id
    ORDER BY payment_transaction.payment_transaction_created_at DESC
    LIMIT 1;

    RETURN return_data;
END;
$$ LANGUAGE plpgsql;
