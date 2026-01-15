-- Performance indexes for storage files functionality
-- These indexes optimize queries on user_id and uploaded_at columns

-- Index on mailroom_registration_table.user_id for faster user lookup
-- Used in: get_user_storage_files RPC to filter user registrations
CREATE INDEX IF NOT EXISTS idx_mailroom_registration_user_id 
ON mailroom_registration_table(user_id);

-- Index on mailroom_file_table.mailbox_item_id for faster joins
-- Used in: get_user_storage_files RPC to join files with mailbox items
CREATE INDEX IF NOT EXISTS idx_mailroom_file_mailbox_item_id 
ON mailroom_file_table(mailbox_item_id);

-- Index on mailroom_file_table.mailroom_file_uploaded_at for faster sorting
-- Used in: get_user_storage_files RPC to sort by uploaded_at (DESC)
CREATE INDEX IF NOT EXISTS idx_mailroom_file_uploaded_at 
ON mailroom_file_table(mailroom_file_uploaded_at DESC);

-- Index on mailroom_file_table.mailroom_file_name for faster text search and sorting
-- Used in: get_user_storage_files RPC for ILIKE search and name sorting
CREATE INDEX IF NOT EXISTS idx_mailroom_file_name 
ON mailroom_file_table(mailroom_file_name);

-- Composite index for mailbox_item_table on mailroom_registration_id
-- Used in: get_user_storage_files RPC to filter mailbox items by registration
CREATE INDEX IF NOT EXISTS idx_mailbox_item_registration_id 
ON mailbox_item_table(mailroom_registration_id);

-- Composite index for mailbox_item_table on mailroom_registration_id + mailbox_item_name
-- Used for filtering files by package name
CREATE INDEX IF NOT EXISTS idx_mailbox_item_registration_name 
ON mailbox_item_table(mailroom_registration_id, mailbox_item_name);

-- Index on mailroom_plan_table.mailroom_plan_id for join optimization
CREATE INDEX IF NOT EXISTS idx_mailroom_plan_id 
ON mailroom_plan_table(mailroom_plan_id);

-- Analyze tables to update statistics for query planner
ANALYZE mailroom_registration_table;
ANALYZE mailroom_file_table;
ANALYZE mailbox_item_table;
ANALYZE mailroom_plan_table;

