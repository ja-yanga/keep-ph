-- Add soft delete support to mailbox_item_table
ALTER TABLE public.mailbox_item_table
ADD COLUMN IF NOT EXISTS mailbox_item_deleted_at TIMESTAMP WITH TIME ZONE;

-- Create index for filtering non-deleted items
CREATE INDEX IF NOT EXISTS idx_mailbox_item_deleted_at ON public.mailbox_item_table(mailbox_item_deleted_at);

