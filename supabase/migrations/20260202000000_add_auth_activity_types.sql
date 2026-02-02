-- Add new activity types and actions for authentication flows
ALTER TYPE public.activity_type ADD VALUE IF NOT EXISTS 'AUTH_FORGOT_PASSWORD';
ALTER TYPE public.activity_type ADD VALUE IF NOT EXISTS 'AUTH_PASSWORD_CHANGE';

-- Ensure we have REGISTER action if not already there (it should be, but just in case)
-- Note: Postgres doesn't support IF NOT EXISTS for ADD VALUE directly in some versions, 
-- but we can use a DO block to be safe.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'activity_action' AND e.enumlabel = 'PASSWORD_CHANGE') THEN
        ALTER TYPE public.activity_action ADD VALUE 'PASSWORD_CHANGE';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'activity_action' AND e.enumlabel = 'RESET_REQUEST') THEN
        ALTER TYPE public.activity_action ADD VALUE 'RESET_REQUEST';
    END IF;
END
$$;
