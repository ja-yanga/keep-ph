-- Add column for soft deletion - delete this before db reset
ALTER TABLE location_locker_table
ADD COLUMN location_locker_deleted_at TIMESTAMP WITH TIME ZONE;