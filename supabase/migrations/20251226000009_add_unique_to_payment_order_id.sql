-- Add unique constraint to payment_transaction_order_id to prevent duplicate registrations
ALTER TABLE public.payment_transaction_table 
ADD CONSTRAINT payment_transaction_table_order_id_unique UNIQUE (payment_transaction_order_id);

