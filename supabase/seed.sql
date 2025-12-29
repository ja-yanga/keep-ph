-- ============================================================================
-- Seed Admin Users in Auth and Users Table
-- ============================================================================
-- This script creates admin users in auth.users, auth.identities, and users_table
-- The trigger handle_new_user() will automatically create the users_table entry
-- but we set raw_user_meta_data to ensure the role is set correctly
-- 
-- USAGE:
-- 1. Open Supabase Dashboard > SQL Editor
-- 2. Paste and run this entire file
-- 3. Change 'admin@example.com' to your desired admin email
-- 4. Change 'admin123' to your desired admin password
-- 5. After running, you can sign in with the admin credentials
--
-- IDEMPOTENCY:
-- This script is idempotent - it can be run multiple times safely.
-- It will only create records that don't already exist:
-- - Admin users: Checks IF NOT EXISTS before inserting
-- - Plans: Checks IF NOT EXISTS before inserting
-- - Locations: Checks by name before inserting
-- - Lockers: Checks if lockers exist for location before inserting
--
-- IMPORTANT:
-- - Default password: 'admin123' (CHANGE THIS IN PRODUCTION!)
-- - If you get extension errors (crypt, gen_salt), try prefixing with 'extensions.':
--   Replace: crypt('admin123', gen_salt('bf'))
--   With: extensions.crypt('admin123', extensions.gen_salt('bf'))
--   And: gen_random_uuid() with extensions.gen_random_uuid()
-- ============================================================================

-- Create admin user(s) in auth.users
-- Password for all admin users: 'admin123' (change this in production!)
-- Only insert if user doesn't already exist (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@example.com') THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'admin@example.com',
      crypt('admin123', gen_salt('bf')),
      current_timestamp,
      current_timestamp,
      current_timestamp,
      '{"provider":"email","providers":["email"]}',
      '{"role":"admin"}',
      current_timestamp,
      current_timestamp,
      '',
      '',
      '',
      ''
    );
  END IF;
END $$;

-- Create identity record for admin user(s)
-- Note: provider_id is required in newer Supabase versions
INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    id,
    id as provider_id, -- provider_id should match user_id for email provider
    format('{"sub":"%s","email":"%s"}', id::text, email)::jsonb,
    'email',
    current_timestamp,
    current_timestamp,
    current_timestamp
FROM auth.users
WHERE email = 'admin@example.com'
  AND NOT EXISTS (
      SELECT 1 FROM auth.identities WHERE user_id = auth.users.id
  );

-- Update users_table to ensure admin role is set (in case trigger already ran)
-- The trigger should have created the entry, but we ensure role is 'admin'
UPDATE public.users_table
SET users_role = 'admin',
    users_is_verified = true
WHERE users_email = 'admin@example.com';

-- If the trigger didn't create the entry (unlikely), create it manually
-- Only insert if entry doesn't exist (idempotent)
INSERT INTO public.users_table (
    users_id,
    users_email,
    users_role,
    users_is_verified,
    users_referral_code
)
SELECT 
    id,
    email,
    'admin',
    true,
    'ADMIN' || upper(substring(md5(random()::text) from 1 for 6))
FROM auth.users
WHERE email = 'admin@example.com'
  AND NOT EXISTS (
      SELECT 1 FROM public.users_table WHERE users_id = auth.users.id
  );

-- ============================================================================
-- Seed Mailroom Plans
-- ============================================================================
-- Insert default mailroom plans that users can select from
-- Only insert if plans don't exist yet (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.mailroom_plan_table LIMIT 1) THEN
    INSERT INTO public.mailroom_plan_table (
      mailroom_plan_name,
      mailroom_plan_price,
      mailroom_plan_description,
      mailroom_plan_storage_limit,
      mailroom_plan_can_receive_mail,
      mailroom_plan_can_receive_parcels,
      mailroom_plan_can_digitize
    ) VALUES
      (
        'Basic Plan',
        500.00,
        'Perfect for individuals who receive occasional mail. Includes basic mail storage and digitization.',
        10, -- 10 items storage limit
        true,
        false,
        true
      ),
      (
        'Standard Plan',
        1000.00,
        'Ideal for regular mail recipients. Includes mail and small parcel storage with full digitization.',
        25, -- 25 items storage limit
        true,
        true,
        true
      ),
      (
        'Premium Plan',
        2000.00,
        'Best for businesses and frequent mail recipients. Unlimited storage, parcels, and priority digitization.',
        NULL, -- Unlimited storage (NULL means unlimited)
        true,
        true,
        true
      );
  END IF;
END $$;

-- ============================================================================
-- Seed Mailroom Locations
-- ============================================================================
-- Insert default mailroom locations that users can select from
-- Only insert if locations don't exist yet (idempotent)
DO $$
DECLARE
  loc1_id UUID;
  loc2_id UUID;
  loc3_id UUID;
  loc4_id UUID;
  loc5_id UUID;
BEGIN
  -- Get or create location IDs (idempotent by name)
  SELECT mailroom_location_id INTO loc1_id
  FROM public.mailroom_location_table
  WHERE mailroom_location_name = 'Manila Central Hub'
  LIMIT 1;
  
  IF loc1_id IS NULL THEN
    INSERT INTO public.mailroom_location_table (
      mailroom_location_name,
      mailroom_location_region,
      mailroom_location_city,
      mailroom_location_barangay,
      mailroom_location_zip,
      mailroom_location_total_lockers,
      mailroom_location_prefix
    ) VALUES (
      'Manila Central Hub',
      'Metro Manila',
      'Manila',
      'Ermita',
      '1000',
      50,
      'MNL'
    )
    RETURNING mailroom_location_id INTO loc1_id;
  END IF;

  -- Get or create Makati location
  SELECT mailroom_location_id INTO loc2_id
  FROM public.mailroom_location_table
  WHERE mailroom_location_name = 'Makati Business District'
  LIMIT 1;
  
  IF loc2_id IS NULL THEN
    INSERT INTO public.mailroom_location_table (
      mailroom_location_name,
      mailroom_location_region,
      mailroom_location_city,
      mailroom_location_barangay,
      mailroom_location_zip,
      mailroom_location_total_lockers,
      mailroom_location_prefix
    ) VALUES (
      'Makati Business District',
      'Metro Manila',
      'Makati',
      'Bel-Air',
      '1209',
      30,
      'MKT'
    )
    RETURNING mailroom_location_id INTO loc2_id;
  END IF;

  -- Get or create Quezon City location
  SELECT mailroom_location_id INTO loc3_id
  FROM public.mailroom_location_table
  WHERE mailroom_location_name = 'Quezon City Main Branch'
  LIMIT 1;
  
  IF loc3_id IS NULL THEN
    INSERT INTO public.mailroom_location_table (
      mailroom_location_name,
      mailroom_location_region,
      mailroom_location_city,
      mailroom_location_barangay,
      mailroom_location_zip,
      mailroom_location_total_lockers,
      mailroom_location_prefix
    ) VALUES (
      'Quezon City Main Branch',
      'Metro Manila',
      'Quezon City',
      'Diliman',
      '1101',
      40,
      'QC'
    )
    RETURNING mailroom_location_id INTO loc3_id;
  END IF;

  -- Get or create BGC location
  SELECT mailroom_location_id INTO loc4_id
  FROM public.mailroom_location_table
  WHERE mailroom_location_name = 'BGC Taguig Hub'
  LIMIT 1;
  
  IF loc4_id IS NULL THEN
    INSERT INTO public.mailroom_location_table (
      mailroom_location_name,
      mailroom_location_region,
      mailroom_location_city,
      mailroom_location_barangay,
      mailroom_location_zip,
      mailroom_location_total_lockers,
      mailroom_location_prefix
    ) VALUES (
      'BGC Taguig Hub',
      'Metro Manila',
      'Taguig',
      'Fort Bonifacio',
      '1630',
      35,
      'BGC'
    )
    RETURNING mailroom_location_id INTO loc4_id;
  END IF;

  -- Get or create Ortigas location
  SELECT mailroom_location_id INTO loc5_id
  FROM public.mailroom_location_table
  WHERE mailroom_location_name = 'Ortigas Center'
  LIMIT 1;
  
  IF loc5_id IS NULL THEN
    INSERT INTO public.mailroom_location_table (
      mailroom_location_name,
      mailroom_location_region,
      mailroom_location_city,
      mailroom_location_barangay,
      mailroom_location_zip,
      mailroom_location_total_lockers,
      mailroom_location_prefix
    ) VALUES (
      'Ortigas Center',
      'Metro Manila',
      'Pasig',
      'Ortigas Center',
      '1605',
      25,
      'ORT'
    )
    RETURNING mailroom_location_id INTO loc5_id;
  END IF;
  
  -- Create lockers only if they don't exist (idempotent)
  IF loc1_id IS NOT NULL THEN

    -- Create lockers for Manila Central Hub (50 lockers: A-001 to A-050)
    -- Only insert if lockers don't exist for this location
    IF NOT EXISTS (SELECT 1 FROM public.location_locker_table WHERE mailroom_location_id = loc1_id LIMIT 1) THEN
      INSERT INTO public.location_locker_table (
        mailroom_location_id,
        location_locker_code,
        location_locker_is_available
      )
      SELECT loc1_id, 'A-' || LPAD(series::text, 3, '0'), true
      FROM generate_series(1, 50) AS series
      WHERE NOT EXISTS (
        SELECT 1 FROM public.location_locker_table 
        WHERE mailroom_location_id = loc1_id 
        AND location_locker_code = 'A-' || LPAD(series::text, 3, '0')
      );
    END IF;

    -- Create lockers for Makati Business District (30 lockers: B-001 to B-030)
    IF loc2_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.location_locker_table WHERE mailroom_location_id = loc2_id LIMIT 1) THEN
      INSERT INTO public.location_locker_table (
        mailroom_location_id,
        location_locker_code,
        location_locker_is_available
      )
      SELECT loc2_id, 'B-' || LPAD(series::text, 3, '0'), true
      FROM generate_series(1, 30) AS series
      WHERE NOT EXISTS (
        SELECT 1 FROM public.location_locker_table 
        WHERE mailroom_location_id = loc2_id 
        AND location_locker_code = 'B-' || LPAD(series::text, 3, '0')
      );
    END IF;

    -- Create lockers for Quezon City Main Branch (40 lockers: C-001 to C-040)
    IF loc3_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.location_locker_table WHERE mailroom_location_id = loc3_id LIMIT 1) THEN
      INSERT INTO public.location_locker_table (
        mailroom_location_id,
        location_locker_code,
        location_locker_is_available
      )
      SELECT loc3_id, 'C-' || LPAD(series::text, 3, '0'), true
      FROM generate_series(1, 40) AS series
      WHERE NOT EXISTS (
        SELECT 1 FROM public.location_locker_table 
        WHERE mailroom_location_id = loc3_id 
        AND location_locker_code = 'C-' || LPAD(series::text, 3, '0')
      );
    END IF;

    -- Create lockers for BGC Taguig Hub (35 lockers: D-001 to D-035)
    IF loc4_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.location_locker_table WHERE mailroom_location_id = loc4_id LIMIT 1) THEN
      INSERT INTO public.location_locker_table (
        mailroom_location_id,
        location_locker_code,
        location_locker_is_available
      )
      SELECT loc4_id, 'D-' || LPAD(series::text, 3, '0'), true
      FROM generate_series(1, 35) AS series
      WHERE NOT EXISTS (
        SELECT 1 FROM public.location_locker_table 
        WHERE mailroom_location_id = loc4_id 
        AND location_locker_code = 'D-' || LPAD(series::text, 3, '0')
      );
    END IF;

    -- Create lockers for Ortigas Center (25 lockers: E-001 to E-025)
    IF loc5_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.location_locker_table WHERE mailroom_location_id = loc5_id LIMIT 1) THEN
      INSERT INTO public.location_locker_table (
        mailroom_location_id,
        location_locker_code,
        location_locker_is_available
      )
      SELECT loc5_id, 'E-' || LPAD(series::text, 3, '0'), true
      FROM generate_series(1, 25) AS series
      WHERE NOT EXISTS (
        SELECT 1 FROM public.location_locker_table 
        WHERE mailroom_location_id = loc5_id 
        AND location_locker_code = 'E-' || LPAD(series::text, 3, '0')
      );
    END IF;
  END IF;
END $$;

