-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.location_lockers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL,
  locker_code text NOT NULL,
  is_available boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT location_lockers_pkey PRIMARY KEY (id),
  CONSTRAINT location_lockers_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.mailroom_locations(id)
);
CREATE TABLE public.mailroom_assigned_lockers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL,
  locker_id uuid NOT NULL UNIQUE,
  assigned_at timestamp with time zone DEFAULT now(),
  status text NOT NULL DEFAULT 'Normal'::text CHECK (status = ANY (ARRAY['Empty'::text, 'Normal'::text, 'Near Full'::text, 'Full'::text])),
  CONSTRAINT mailroom_assigned_lockers_pkey PRIMARY KEY (id),
  CONSTRAINT mailroom_assigned_lockers_registration_id_fkey FOREIGN KEY (registration_id) REFERENCES public.mailroom_registrations(id),
  CONSTRAINT mailroom_assigned_lockers_locker_id_fkey FOREIGN KEY (locker_id) REFERENCES public.location_lockers(id)
);
CREATE TABLE public.mailroom_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  region text,
  city text,
  barangay text,
  zip text,
  total_lockers integer NOT NULL DEFAULT 0,
  code text,
  CONSTRAINT mailroom_locations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.mailroom_packages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tracking_number text NOT NULL UNIQUE,
  registration_id uuid NOT NULL,
  package_type text NOT NULL CHECK (package_type = ANY (ARRAY['Document'::text, 'Parcel'::text])),
  status text NOT NULL DEFAULT 'STORED'::text CHECK (status = ANY (ARRAY['STORED'::text, 'RELEASED'::text, 'RETRIEVED'::text, 'DISPOSED'::text, 'REQUEST_TO_RELEASE'::text, 'REQUEST_TO_DISPOSE'::text, 'REQUEST_TO_SCAN'::text])),
  notes text,
  image_url text,
  mailroom_full boolean DEFAULT false,
  received_at timestamp with time zone DEFAULT now(),
  locker_id uuid,
  release_proof_url text,
  release_to_name text,
  release_address text,
  release_address_id uuid,
  CONSTRAINT mailroom_packages_pkey PRIMARY KEY (id),
  CONSTRAINT mailroom_packages_registration_id_fkey FOREIGN KEY (registration_id) REFERENCES public.mailroom_registrations(id),
  CONSTRAINT mailroom_packages_locker_id_fkey FOREIGN KEY (locker_id) REFERENCES public.location_lockers(id)
);
CREATE TABLE public.mailroom_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric NOT NULL,
  description text,
  storage_limit numeric,
  can_receive_mail boolean DEFAULT true,
  can_receive_parcels boolean DEFAULT false,
  can_digitize boolean DEFAULT true,
  CONSTRAINT mailroom_plans_pkey PRIMARY KEY (id)
);
CREATE TABLE public.mailroom_registrations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  location_id uuid NOT NULL,
  plan_id uuid NOT NULL,
  locker_qty integer NOT NULL,
  months integer NOT NULL,
  notes text,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  full_name text NOT NULL,
  email text NOT NULL,
  mobile numeric NOT NULL,
  mailroom_status boolean DEFAULT true,
  mailroom_code text,
  auto_renew boolean DEFAULT true,
  CONSTRAINT mailroom_registrations_pkey PRIMARY KEY (id),
  CONSTRAINT mailroom_registrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT mailroom_registrations_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.mailroom_locations(id),
  CONSTRAINT mailroom_registrations_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.mailroom_plans(id)
);
CREATE TABLE public.mailroom_scans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size_mb numeric NOT NULL DEFAULT 0,
  mime_type text,
  uploaded_at timestamp with time zone DEFAULT now(),
  CONSTRAINT mailroom_scans_pkey PRIMARY KEY (id),
  CONSTRAINT mailroom_scans_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.mailroom_packages(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text CHECK (type = ANY (ARRAY['PACKAGE_ARRIVED'::text, 'PACKAGE_RELEASED'::text, 'PACKAGE_DISPOSED'::text, 'SCAN_READY'::text, 'SYSTEM'::text, 'REWARD_PROCESSING'::text, 'REWARD_PAID'::text])),
  is_read boolean DEFAULT false,
  link text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.referrals_table (
  referrals_id integer NOT NULL DEFAULT nextval('referrals_table_referrals_id_seq'::regclass),
  referrals_user_id uuid,
  referrals_referred_email character varying,
  referrals_service_type character varying,
  referrals_date_created timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT referrals_table_pkey PRIMARY KEY (referrals_id),
  CONSTRAINT referrals_table_referrals_user_id_fkey FOREIGN KEY (referrals_user_id) REFERENCES public.users(id)
);
CREATE TABLE public.rewards_claims (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  payment_method text NOT NULL,
  account_details text NOT NULL,
  amount numeric NOT NULL DEFAULT 500.00,
  status text NOT NULL DEFAULT 'PENDING'::text CHECK (status = ANY (ARRAY['PENDING'::text, 'PROCESSING'::text, 'PAID'::text, 'REJECTED'::text])),
  referral_count integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  processed_at timestamp with time zone,
  proof_path text,
  CONSTRAINT rewards_claims_pkey PRIMARY KEY (id),
  CONSTRAINT rewards_claims_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.user_addresses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  label text,
  line1 text NOT NULL,
  line2 text,
  city text,
  region text,
  postal text,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  contact_name text,
  CONSTRAINT user_addresses_pkey PRIMARY KEY (id),
  CONSTRAINT user_addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password text,
  first_name text NOT NULL,
  last_name text NOT NULL,
  role text NOT NULL DEFAULT 'user'::text,
  created_at timestamp with time zone DEFAULT now(),
  avatar_url text,
  needs_onboarding boolean DEFAULT true,
  referral_code character varying,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);