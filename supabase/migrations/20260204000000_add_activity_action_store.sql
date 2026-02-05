-- Add STORE to activity_action enum (used when admin stores a package in mailroom)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'activity_action' AND e.enumlabel = 'STORE'
    ) THEN
        ALTER TYPE public.activity_action ADD VALUE 'STORE';
    END IF;
END
$$;
