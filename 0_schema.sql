-- Drop the public schema and everything inside it
DROP SCHEMA public CASCADE;

-- Recreate the public schema
CREATE SCHEMA public;

-- create buckets
INSERT INTO storage.buckets (id, name, owner, public, file_size_limit, allowed_mime_types)
VALUES
('mailroom_proofs', 'mailroom_proofs', NULL, false, NULL, NULL),
('mailroom_scans', 'mailroom_scans', NULL, false, NULL, NULL),
('reward_proofs', 'reward_proofs', NULL, false, NULL, NULL),
('avatars', 'avatars', NULL, false, NULL, NULL),
('user-kyc', 'user-kyc', NULL, false, NULL, NULL);


-- enums
CREATE TYPE public.user_kyc_status AS ENUM (
  'SUBMITTED',
  'VERIFIED',
  'REJECTED'
);

-- create sequence first
CREATE SEQUENCE public.referrals_table_referrals_id_seq;

-- tables
CREATE TABLE public.location_lockers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL, -- FK → references mailroom_locations(id)
  locker_code text NOT NULL,
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.mailroom_assigned_lockers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL, -- FK → references mailroom_registrations(id)
  locker_id uuid NOT NULL, -- FK → references location_lockers(id)
  assigned_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'Normal' -- CHECK: ['Empty', 'Normal', 'Near Full', 'Full']
);

CREATE TABLE public.mailroom_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  region text,
  city text,
  barangay text,
  zip text,
  total_lockers integer NOT NULL DEFAULT 0,
  code text
);

CREATE TABLE public.mailroom_packages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL, -- FK → references mailroom_registrations(id)
  package_type text NOT NULL, -- CHECK: ['Document', 'Parcel']
  status text NOT NULL DEFAULT 'STORED', -- CHECK: ['STORED','RELEASED','RETRIEVED','DISPOSED','REQUEST_TO_RELEASE','REQUEST_TO_DISPOSE','REQUEST_TO_SCAN']
  notes text,
  image_url text,
  mailroom_full boolean DEFAULT false,
  received_at timestamptz DEFAULT now(),
  locker_id uuid, -- FK → references location_lockers(id)
  release_proof_url text,
  release_to_name text,
  release_address text,
  release_address_id uuid,
  package_name text,
  package_photo text
);

CREATE TABLE public.mailroom_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric NOT NULL,
  description text,
  storage_limit numeric,
  can_receive_mail boolean DEFAULT true,
  can_receive_parcels boolean DEFAULT false,
  can_digitize boolean DEFAULT true
);

CREATE TABLE public.mailroom_registrations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, -- FK → references users(id)
  location_id uuid NOT NULL, -- FK → references mailroom_locations(id)
  plan_id uuid NOT NULL, -- FK → references mailroom_plans(id)
  locker_qty integer NOT NULL,
  months integer NOT NULL,
  notes text,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  full_name text NOT NULL,
  email text NOT NULL,
  mobile text NOT NULL,
  mailroom_status boolean DEFAULT true,
  mailroom_code text,
  auto_renew boolean DEFAULT true,
  order_id text,
  paid boolean DEFAULT false,
  paymongo_payment_id text
);

CREATE TABLE public.mailroom_scans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL, -- FK → references mailroom_packages(id)
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size_mb numeric NOT NULL DEFAULT 0,
  mime_type text,
  uploaded_at timestamptz DEFAULT now()
);

CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, -- FK → references users(id)
  title text NOT NULL,
  message text NOT NULL,
  type text, -- CHECK: ['PACKAGE_ARRIVED','PACKAGE_RELEASED','PACKAGE_DISPOSED','SCAN_READY','SYSTEM','REWARD_PROCESSING','REWARD_PAID']
  is_read boolean DEFAULT false,
  link text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.paymongo_payments (
  id text NOT NULL,
  source_id text,
  order_id text,
  status text,
  amount integer,
  currency text,
  raw jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.referrals_table (
  referrals_id integer NOT NULL DEFAULT nextval('referrals_table_referrals_id_seq'::regclass),
  referrals_user_id uuid, -- FK → references users(id)
  referrals_referred_email varchar,
  referrals_service_type varchar,
  referrals_date_created timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.rewards_claims (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, -- FK → references users(id)
  payment_method text NOT NULL,
  account_details text NOT NULL,
  amount numeric NOT NULL DEFAULT 500.00,
  status text NOT NULL DEFAULT 'PENDING', -- CHECK: ['PENDING','PROCESSING','PAID','REJECTED']
  referral_count integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  proof_path text
);

CREATE TABLE public.user_addresses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, -- FK → references users(id)
  label text,
  line1 text NOT NULL,
  line2 text,
  city text,
  region text,
  postal text,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  contact_name text
);

CREATE TABLE public.user_kyc (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, -- FK → references users(id)
  status user_kyc_status NOT NULL DEFAULT 'SUBMITTED', -- enum
  id_front_url text NOT NULL,
  id_back_url text NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  id_document_type text,
  full_name text,
  first_name text,
  last_name text,
  address jsonb,
  id_document_number text,
  birth_date date
);

CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  password text,
  first_name text NOT NULL,
  last_name text NOT NULL,
  role text NOT NULL DEFAULT 'user', -- enum: 'user','admin', etc.
  created_at timestamptz DEFAULT now(),
  avatar_url text,
  needs_onboarding boolean DEFAULT true,
  referral_code varchar
);

GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Grant full privileges on all tables to all users
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO public;

-- Grant full privileges on all sequences to all users
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO public;

-- Grant full privileges on all functions to all users
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO public;

-- Grant privileges on the schema itself
GRANT ALL PRIVILEGES ON SCHEMA public TO public;