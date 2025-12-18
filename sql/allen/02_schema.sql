INSERT INTO storage.buckets (id, name, owner, public, file_size_limit, allowed_mime_types) VALUES
  ('package_table_proofs', 'package_table_proofs', NULL, true, NULL, NULL),
  ('scan_table_files', 'scan_table_files', NULL, true, NULL, NULL),
  ('reward_claim_table_proofs', 'reward_claim_table_proofs', NULL, true, NULL, NULL),
  ('user_table_avatars', 'user_table_avatars', NULL, true, NULL, NULL),
  ('kyc_table_files', 'kyc_table_files', NULL, false, NULL, NULL);

-- ========================================
-- USER TABLE
-- ========================================
-- Previously: public.users
-- Changes: renamed PK, added _table suffix, column ordering fixed for readability
CREATE TABLE public.user_table (
  user_table_id UUID DEFAULT gen_random_uuid() PRIMARY KEY, -- prev: id
  email TEXT NOT NULL UNIQUE,
  password TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role public.user_role DEFAULT 'USER' NOT NULL,
  avatar_url TEXT,
  needs_onboarding BOOLEAN DEFAULT TRUE,
  referral_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- ADDRESS TABLE
-- ========================================
-- Previously: public.user_addresses
-- Changes: PK renamed, column ordering fixed for readability
CREATE TABLE public.address_table (
  address_table_id UUID DEFAULT gen_random_uuid() PRIMARY KEY, -- prev: id
  user_table_id UUID NOT NULL, -- FK added separately
  label TEXT,
  line1 TEXT NOT NULL,
  line2 TEXT,
  city TEXT,
  region TEXT,
  postal TEXT,
  contact_name TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- KYC TABLE
-- ========================================
-- Previously: public.user_kyc
-- Changes: PK renamed, JSONB removed, address info split into separate columns for readability
CREATE TABLE public.kyc_table (
  kyc_table_id UUID DEFAULT gen_random_uuid() PRIMARY KEY, -- prev: id
  user_table_id UUID UNIQUE NOT NULL, -- FK
  status public.kyc_status DEFAULT 'PROCESSING' NOT NULL,
  id_front_url TEXT NOT NULL,
  id_back_url TEXT NOT NULL,
  id_document_type TEXT,
  full_name TEXT,
  first_name TEXT,
  last_name TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  address_city TEXT,
  address_region TEXT,
  address_postal TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ========================================
-- PLAN TABLE
-- ========================================
-- Previously: public.mailroom_plans
-- Changes: PK renamed, column ordering fixed
CREATE TABLE public.plan_table (
  plan_table_id UUID DEFAULT gen_random_uuid() PRIMARY KEY, -- prev: id
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  description TEXT,
  storage_limit NUMERIC,
  can_receive_mail BOOLEAN DEFAULT TRUE,
  can_receive_parcels BOOLEAN DEFAULT FALSE,
  can_digitize BOOLEAN DEFAULT TRUE
);

-- ========================================
-- LOCATION TABLE
-- ========================================
-- Previously: public.mailroom_locations
-- Changes: PK renamed, column ordering fixed
CREATE TABLE public.location_table (
  location_table_id UUID DEFAULT gen_random_uuid() PRIMARY KEY, -- prev: id
  name TEXT NOT NULL,
  region TEXT,
  city TEXT,
  barangay TEXT,
  zip TEXT,
  code TEXT,
  total_lockers INTEGER DEFAULT 0 NOT NULL
);

-- ========================================
-- PAYMONGO PAYMENTS TABLE
-- ========================================
-- Previously: public.paymongo_payments
-- Changes: PK renamed, _table suffix, kept JSONB for raw API response
CREATE TABLE public.paymongo_payments_table (
  paymongo_payments_table_id TEXT PRIMARY KEY, -- prev: id
  user_table_id UUID,
  source_id TEXT,
  order_id TEXT,
  status TEXT,
  amount INTEGER,
  currency TEXT,
  raw JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- NOTIFICATION TABLE
-- ========================================
-- Previously: public.notifications
-- Changes: PK renamed, column ordering fixed
CREATE TABLE public.notification_table (
  notification_table_id UUID DEFAULT gen_random_uuid() PRIMARY KEY, -- prev: id
  user_table_id UUID NOT NULL, 
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type public.notification_type,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ========================================
-- REFERRAL TABLE
-- ========================================
-- Previously: public.referrals_table
-- Changes: PK renamed, column ordering fixed
CREATE TABLE public.referral_table (
  referral_table_id UUID DEFAULT gen_random_uuid() PRIMARY KEY, 
  user_table_id UUID, 
  referred_email TEXT,
  service_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- REWARD CLAIM TABLE
-- ========================================
-- Previously: public.rewards_claims
-- Changes: PK renamed, column ordering fixed
CREATE TABLE public.reward_claim_table (
  reward_claim_table_id UUID DEFAULT gen_random_uuid() PRIMARY KEY, -- prev: id
  user_table_id UUID NOT NULL,
  payment_method TEXT NOT NULL,
  account_details TEXT NOT NULL,
  amount NUMERIC DEFAULT 500.00,
  referral_count INTEGER NOT NULL,
  status public.reward_status DEFAULT 'PENDING' NOT NULL,
  proof_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  processed_at TIMESTAMPTZ
);

-- ========================================
-- REGISTRATION TABLE
-- ========================================
-- Previously: public.mailroom_registrations
-- Changes: PK renamed, column ordering fixed, pickup info moved to package_table
CREATE TABLE public.registration_table (
  registration_table_id UUID DEFAULT gen_random_uuid() PRIMARY KEY, -- prev: id
  user_table_id UUID NOT NULL,
  location_table_id UUID NOT NULL,
  plan_table_id UUID NOT NULL,
  locker_qty INTEGER NOT NULL,
  months INTEGER NOT NULL,
  notes TEXT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  mobile TEXT NOT NULL,
  mailroom_status BOOLEAN DEFAULT TRUE,
  mailroom_code TEXT UNIQUE,
  auto_renew BOOLEAN DEFAULT TRUE,
  order_id TEXT UNIQUE,
  payment_id TEXT, 
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- LOCKER TABLE
-- ========================================
-- Previously: public.location_lockers
-- Changes: PK renamed, column ordering fixed
CREATE TABLE public.locker_table (
  locker_table_id UUID DEFAULT gen_random_uuid() PRIMARY KEY, -- prev: id
  location_table_id UUID NOT NULL,
  locker_code TEXT NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- ASSIGNMENT TABLE
-- ========================================
-- Previously: public.mailroom_assigned_lockers
-- Changes: PK renamed, column ordering fixed
CREATE TABLE public.assignment_table (
  assignment_table_id UUID DEFAULT gen_random_uuid() PRIMARY KEY, -- prev: id
  registration_table_id UUID NOT NULL,
  locker_table_id UUID UNIQUE NOT NULL, 
  status public.assignment_status DEFAULT 'NORMAL' NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- PACKAGE TABLE
-- ========================================
-- Previously: public.mailroom_packages
-- Changes: PK renamed, pickup info split into separate columns, JSONB removed, release address FK added
CREATE TABLE public.package_table (
  package_table_id UUID DEFAULT gen_random_uuid() PRIMARY KEY, -- prev: id
  registration_table_id UUID NOT NULL,
  locker_table_id UUID,
  package_type public.package_type NOT NULL,
  status public.package_status DEFAULT 'STORED' NOT NULL,
  package_name TEXT,
  pickup_on_behalf BOOLEAN DEFAULT FALSE,
  pickup_name TEXT,
  pickup_mobile TEXT,
  pickup_contact_mode TEXT,
  package_photo TEXT,
  mailroom_full BOOLEAN DEFAULT FALSE,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  release_to_name TEXT,
  release_address TEXT,
  release_address_table_id UUID, 
  release_proof_url TEXT
);

-- ========================================
-- SCAN TABLE
-- ========================================
-- Previously: public.mailroom_scans
-- Changes: PK renamed, column ordering fixed
CREATE TABLE public.scan_table (
  scan_table_id UUID DEFAULT gen_random_uuid() PRIMARY KEY, -- prev: id
  package_table_id UUID NOT NULL, 
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size_mb NUMERIC DEFAULT 0,
  mime_type TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);
