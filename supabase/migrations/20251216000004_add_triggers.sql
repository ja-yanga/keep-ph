-- ============================================================================
-- TRIGGERS FOR SUPABASE AUTH.USERS TO USERS_TABLE INTEGRATION
-- ============================================================================
-- This file contains triggers and functions to automatically sync
-- Supabase auth.users with the public.users_table
-- ============================================================================

-- Drop existing functions/triggers if needed
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP FUNCTION IF EXISTS public.handle_user_update() CASCADE;

-- ============================================================================
-- FUNCTION: Handle New User Creation
-- ============================================================================
-- Automatically creates a record in users_table when a new user signs up
-- in Supabase auth.users
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
  v_mobile_number TEXT;
BEGIN
  -- Get role from metadata (defaults to 'user' if not provided)
  v_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'user');

  -- Update auth.users metadata if role is missing
  IF NEW.raw_user_meta_data ->> 'role' IS NULL THEN
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{role}',
      '"user"'::jsonb
    )
    WHERE id = NEW.id;
  END IF;
  
  -- Get mobile number from metadata if provided
  v_mobile_number := NEW.raw_user_meta_data ->> 'mobile_number';
  
  -- Insert into users_table with all relevant fields
  INSERT INTO public.users_table (
    users_id,
    users_email,
    users_role,
    users_avatar_url,
    users_is_verified,
    mobile_number,
    users_created_at
  )
  VALUES (
    NEW.id, -- Use auth.users.id as users_id
    NEW.email,
    v_role,
    NEW.raw_user_meta_data ->> 'avatar_url',
    COALESCE((NEW.raw_user_meta_data ->> 'email_verified')::BOOLEAN, false),
    v_mobile_number,
    COALESCE(NEW.created_at, now())
  )
  ON CONFLICT (users_id) DO UPDATE SET
    users_email = EXCLUDED.users_email,
    users_avatar_url = EXCLUDED.users_avatar_url,
    users_is_verified = EXCLUDED.users_is_verified,
    mobile_number = EXCLUDED.mobile_number;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- ============================================================================
-- TRIGGER: On Auth User Created
-- ============================================================================
-- Fires after a new user is inserted into auth.users
-- Automatically creates corresponding record in users_table
-- ============================================================================
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- FUNCTION: Handle User Update
-- ============================================================================
-- Updates users_table when auth.users is updated (e.g., email change, verification)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Update users_table when auth.users is updated
  UPDATE public.users_table
  SET
    users_email = NEW.email,
    users_avatar_url = COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', users_avatar_url),
    users_is_verified = COALESCE((NEW.raw_user_meta_data ->> 'email_verified')::BOOLEAN, users_is_verified),
    mobile_number = COALESCE(NEW.raw_user_meta_data ->> 'mobile_number', mobile_number)
  WHERE users_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- ============================================================================
-- TRIGGER: On Auth User Updated
-- ============================================================================
-- Fires when a user is updated in auth.users
-- Syncs changes to users_table
-- ============================================================================
CREATE TRIGGER on_auth_user_updated
AFTER UPDATE ON auth.users
FOR EACH ROW
WHEN (OLD.email IS DISTINCT FROM NEW.email OR 
      OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data)
EXECUTE FUNCTION public.handle_user_update();

-- ============================================================================
-- FUNCTION: Handle User Deletion from public.users_table
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete corresponding user in auth.users
  DELETE FROM auth.users
  WHERE id = OLD.users_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- ============================================================================
-- TRIGGER: On User Deleted in users_table
-- ============================================================================
CREATE TRIGGER on_user_deleted
AFTER DELETE ON public.users_table
FOR EACH ROW EXECUTE FUNCTION public.handle_user_delete();
