-- Fix infinite recursion in users_table admin policy
-- The issue: The admin policy queries users_table to check if user is admin,
-- which triggers RLS again, causing infinite recursion.

-- Step 1: Create a security definer function to check admin status
-- This bypasses RLS to avoid recursion
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  IF user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- This query runs with SECURITY DEFINER, so it bypasses RLS
  SELECT users_role
  INTO user_role
  FROM public.users_table
  WHERE users_table.users_id = user_id
  LIMIT 1;

  RETURN COALESCE(user_role = 'admin', FALSE);
END;
$$;

-- Step 2: Drop the old recursive policy
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users_table;

-- Step 3: Create a new admin policy that uses the security definer function
-- This avoids recursion because the function bypasses RLS
CREATE POLICY "Admins can manage all users"
ON public.users_table
FOR all
USING (public.is_admin(auth.uid()));

