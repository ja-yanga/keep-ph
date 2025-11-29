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
  CONSTRAINT mailroom_packages_pkey PRIMARY KEY (id),
  CONSTRAINT mailroom_packages_registration_id_fkey FOREIGN KEY (registration_id) REFERENCES public.mailroom_registrations(id)
);
CREATE TABLE public.mailroom_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric NOT NULL,
  description text,
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
  CONSTRAINT mailroom_registrations_pkey PRIMARY KEY (id),
  CONSTRAINT mailroom_registrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT mailroom_registrations_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.mailroom_locations(id),
  CONSTRAINT mailroom_registrations_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.mailroom_plans(id)
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