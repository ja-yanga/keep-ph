-- Remove all policies for files
DROP POLICY IF EXISTS objects_policy ON storage.objects;
DROP POLICY IF EXISTS buckets_policy ON storage.buckets;

-- Delete file buckets created and files uploaded
DELETE FROM storage.objects;
DELETE FROM storage.buckets;

-- Start storage
INSERT INTO storage.buckets (id, name, public) VALUES
('MAILROOM_PROOFS', 'MAILROOM_PROOFS', true);
INSERT INTO storage.buckets (id, name, public) VALUES
('MAILROOM_SCANS', 'MAILROOM_SCANS', true);
INSERT INTO storage.buckets (id, name, public) VALUES
('REWARD_PROOFS', 'REWARD_PROOFS', true);
INSERT INTO storage.buckets (id, name, public) VALUES
('AVATARS', 'AVATARS', true);
INSERT INTO storage.buckets (id, name, public) VALUES
('USER-KYC-DOCUMENTS', 'USER-KYC-DOCUMENTS', true);

-- Drop existing schemas if they exist
DROP SCHEMA IF EXISTS public CASCADE;
DROP SCHEMA IF EXISTS attachment_schema CASCADE;
DROP SCHEMA IF EXISTS user_schema CASCADE;
DROP SCHEMA IF EXISTS mailroom_schema CASCADE;
DROP SCHEMA IF EXISTS billing_schema CASCADE;
DROP SCHEMA IF EXISTS status_schema CASCADE;
DROP SCHEMA IF EXISTS referral_schema CASCADE;
DROP SCHEMA IF EXISTS notification_schema CASCADE;

-- Create all Schemas
CREATE SCHEMA public AUTHORIZATION postgres;
CREATE SCHEMA attachment_schema AUTHORIZATION postgres;
CREATE SCHEMA user_schema AUTHORIZATION postgres;
CREATE SCHEMA mailroom_schema AUTHORIZATION postgres;
CREATE SCHEMA billing_schema AUTHORIZATION postgres;
CREATE SCHEMA status_schema AUTHORIZATION postgres;
CREATE SCHEMA referral_schema AUTHORIZATION postgres;
CREATE SCHEMA notification_schema AUTHORIZATION postgres;

-- Create all Enums
CREATE TYPE user_role AS ENUM ('USER', 'ADMIN');
CREATE TYPE user_kyc_status AS ENUM ('SUBMITTED', 'VERIFIED', 'REJECTED');
CREATE TYPE id_document_type AS ENUM ('PASSPORT', 'DRIVER_LICENSE', 'NATIONAL_ID');
CREATE TYPE reward_status AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'REJECTED');
CREATE TYPE payment_method AS ENUM ('BANK_TRANSFER', 'GCASH', 'PAYMAYA','CARD');
CREATE TYPE notification_type AS ENUM ('PACKAGE_ARRIVED', 'PACKAGE_RELEASED', 'PACKAGE_DISPOSED', 'SCAN_READY', 'SYSTEM', 'REWARD_PROCESSING', 'REWARD_PAID');
CREATE TYPE locker_status AS ENUM ('EMPTY', 'NORMAL', 'NEAR_FULL', 'FULL');
CREATE TYPE plan_type AS ENUM ('FREE', 'DIGITAL', 'PERSONAL', 'BUSINESS');
CREATE TYPE mailroom_item_type AS ENUM ('DOCUMENT', 'PARCEL');
CREATE TYPE mailroom_item_status AS ENUM ('STORED', 'RELEASED', 'RETRIEVED', 'DISPOSED', 'REQUEST_TO_RELEASE', 'REQUEST_TO_DISPOSE', 'REQUEST_TO_SCAN');
CREATE TYPE request_type AS ENUM ('HOLD', 'RELEASE', 'DISPOSE', 'SCAN',);
CREATE TYPE request_status AS ENUM ('PENDING', 'COMPLETED', 'REJECTED');

-- Attachments Schema table
CREATE TABLE attachment_schema.attachment_user_avatar_table (
  attachment_user_avatar_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- fk to user_schema.user_table(user_id)
  attachment_user_avatar_file_name TEXT NOT NULL,
  attachment_user_avatar_file_url TEXT NOT NULL,
  attachment_user_avatar_file_size_mb NUMERIC NOT NULL DEFAULT 0,
  attachment_user_avatar_mime_type TEXT,
  attachment_user_avatar_uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE attachment_schema.attachment_user_kyc_table (
  attachment_user_kyc_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- fk to user_schema.user_table(user_id)
  attachment_user_kyc_file_name TEXT NOT NULL,
  attachment_user_kyc_file_url TEXT NOT NULL,
  attachment_user_kyc_file_size_mb NUMERIC NOT NULL DEFAULT 0,
  attachment_user_kyc_mime_type TEXT,
  attachment_user_kyc_uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE attachment_schema.attachment_mailroom_table (
  attachment_mailromm_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attachment_mailroom_file_name TEXT NOT NULL,
  attachment_mailroom_file_url TEXT NOT NULL,
  attachment_mailroom_file_size_mb NUMERIC NOT NULL DEFAULT 0,
  attachment_mailroom_mime_type TEXT,
  attachment_mailroom_uploaded_at TIMESTAMPTZ DEFAULT NOW()
)

-- User Schema Tables
-- CREATE TABLE public.users (
--   id uuid NOT NULL DEFAULT gen_random_uuid(),
--   email text NOT NULL,
--   password text,
--   first_name text NOT NULL,
--   last_name text NOT NULL,
--   role text NOT NULL DEFAULT 'user', -- enum: 'user','admin', etc.
--   created_at timestamptz DEFAULT now(),
--   avatar_url text,
--   needs_onboarding boolean DEFAULT true,
--   referral_code varchar
-- );
CREATE TABLE user_schema.user_table (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL UNIQUE,
  -- user_password TEXT, -- remove (x needed)
  user_first_name TEXT NOT NULL,
  user_last_name TEXT NOT NULL,
  user_role user_role NOT NULL DEFAULT 'USER', --enums
  user_needs_onboarding BOOLEAN DEFAULT true,
  user_referral_code VARCHAR,
  user_created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create User Address Table
-- CREATE TABLE public.user_addresses (
--   id uuid NOT NULL DEFAULT gen_random_uuid(),
--   user_id uuid NOT NULL, -- FK → references users(id)
--   label text,
--   line1 text NOT NULL,
--   line2 text,
--   city text,
--   region text,
--   postal text,
--   is_default boolean DEFAULT false,
--   created_at timestamptz DEFAULT now(),
--   contact_name text
-- );
CREATE TABLE user_schema.user_address_table (
  user_address_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- fk to user_schema.user_table(user_id)
  user_address_label TEXT,
  user_address_line1 TEXT NOT NULL,
  user_address_line2 TEXT,
  user_address_city TEXT,
  user_address_region TEXT,
  user_address_postal TEXT,
  user_address_is_default BOOLEAN DEFAULT false,
  user_address_contact_name TEXT,
  user_address_created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CREATE TABLE public.user_kyc (
--   id uuid NOT NULL DEFAULT gen_random_uuid(),
--   user_id uuid NOT NULL, -- FK → references users(id)
--   status user_kyc_status NOT NULL DEFAULT 'SUBMITTED', -- enum
--   id_front_url text NOT NULL,
--   id_back_url text NOT NULL,
--   submitted_at timestamptz NOT NULL DEFAULT now(),
--   verified_at timestamptz,
--   created_at timestamptz NOT NULL DEFAULT now(),
--   updated_at timestamptz NOT NULL DEFAULT now(),
--   id_document_type text,
--   full_name text,
--   first_name text,
--   last_name text,
--   address jsonb,
--   id_document_number text,
--   birth_date date
-- );
CREATE TABLE user_schema.user_kyc_table (
  user_kyc_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE, -- fk to user_schema.user_table(user_id)
  user_kyc_status user_kyc_status NOT NULL DEFAULT 'SUBMITTED',
  user_kyc_submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_kyc_verified_at TIMESTAMPTZ,
  user_kyc_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_kyc_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
--added
CREATE TABLE user_schema.user_kyc_profile_table (
  user_kyc_profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_kyc_id UUID NOT NULL, -- fk to user_schema.user_kyc_table(user_kyc_id)
  user_kyc_profile_id_document_type id_document_type,
  user_kyc_profile_first_name TEXT,
  user_kyc_profile_last_name TEXT,
  user_kyc_profile_id_document_number TEXT,
  user_kyc_profile_birth_date DATE
)
--added
CREATE TABLE user_schema.user_kyc_address_table (
  user_kyc_address_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_kyc_id UUID NOT NULL, -- fk to user_schema.user_kyc_table(user_kyc_id)
  user_kyc_address_region TEXT NOT NULL,
  user_kyc_address_province TEXT NOT NULL,
  user_kyc_address_city TEXT NOT NULL,
  user_kyc_address_barangay TEXT NOT NULL,
  user_kyc_address_street TEXT,
  user_kyc_address_postal_code TEXT,
  user_kyc_address_is_primary BOOLEAN NOT NULL DEFAULT TRUE
)

-- Create Referral Table
-- CREATE TABLE public.referrals_table (
--   referrals_id integer NOT NULL DEFAULT nextval('referrals_table_referrals_id_seq'::regclass),
--   referrals_user_id uuid, -- FK → references users(id)
--   referrals_referred_email varchar,
--   referrals_service_type varchar,
--   referrals_date_created timestamp without time zone DEFAULT CURRENT_TIMESTAMP
-- );
CREATE TABLE referral_schema.referral_table (
  -- referral_id INTEGER PRIMARY KEY DEFAULT nextval('referral_schema.referral_table_referral_id_seq'::regclass),
  referral_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- fk to user_schema.user_table(user_id)
  referral_referred_email VARCHAR,
  referral_service_type VARCHAR,
  referral_date_created TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CREATE SEQUENCE referral_schema.referral_table_referral_id_seq;

-- Create Rewawrd Claims Table
-- CREATE TABLE public.rewards_claims (
--   id uuid NOT NULL DEFAULT gen_random_uuid(),
--   user_id uuid NOT NULL, -- FK → references users(id)
--   payment_method text NOT NULL,
--   account_details text NOT NULL,
--   amount numeric NOT NULL DEFAULT 500.00,
--   status text NOT NULL DEFAULT 'PENDING', -- CHECK: ['PENDING','PROCESSING','PAID','REJECTED']
--   referral_count integer NOT NULL,
--   created_at timestamptz NOT NULL DEFAULT now(),
--   processed_at timestamptz,
--   proof_path text
-- );
CREATE TABLE referral_schema.rewards_claims_table (
  rewards_claims_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- fk to user_schema.user_table(user_id)
  rewards_claims_payment_method payment_method NOT NULL,
  rewards_claims_account_details TEXT NOT NULL,
  rewards_claims_amount NUMERIC NOT NULL DEFAULT 500.00,
  rewards_claims_status reward_status NOT NULL DEFAULT 'PENDING',
  rewards_claims_referral_count INTEGER NOT NULL,
  rewards_claims_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rewards_claims_processed_at TIMESTAMPTZ,
  -- rewards_claims_proof_path TEXT --TODO: ?
);

-- Create Notification Table
-- CREATE TABLE public.notifications (
--   id uuid NOT NULL DEFAULT gen_random_uuid(),
--   user_id uuid NOT NULL, -- FK → references users(id)
--   title text NOT NULL,
--   message text NOT NULL,
--   type text, -- CHECK: ['PACKAGE_ARRIVED','PACKAGE_RELEASED','PACKAGE_DISPOSED','SCAN_READY','SYSTEM','REWARD_PROCESSING','REWARD_PAID']
--   is_read boolean DEFAULT false,
--   link text,
--   created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
-- );
CREATE TABLE notification_schema.notification_table (
  notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- fk to user_schema.user_table(user_id)
  notification_title TEXT NOT NULL,
  notification_message TEXT NOT NULL,
  notification_type notification_type,
  notification_link TEXT,
  notification_is_read BOOLEAN DEFAULT false,
  notification_read_at TIMESTAMPTZ,
  notification_created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- Mailroom Schema Tables
-- CREATE TABLE public.mailroom_plans (
--   id uuid NOT NULL DEFAULT gen_random_uuid(),
--   name text NOT NULL,
--   price numeric NOT NULL,
--   description text,
--   storage_limit numeric,
--   can_receive_mail boolean DEFAULT true,
--   can_receive_parcels boolean DEFAULT false,
--   can_digitize boolean DEFAULT true
-- );
CREATE TABLE mailroom_schema.mailroom_plan_table (
  mailroom_plan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mailroom_plan_type plan_type,
  mailroom_plan_price NUMERIC NOT NULL
  -- mailroom_plan_description TEXT,
  -- mailroom_plan_can_receive_mail BOOLEAN DEFAULT true,
  -- mailroom_plan_can_receive_parcels BOOLEAN DEFAULT false,
  -- mailroom_plan_can_digitize BOOLEAN DEFAULT true
);

-- Mailroom locations
-- CREATE TABLE public.mailroom_locations (
--   id uuid NOT NULL DEFAULT gen_random_uuid(),
--   name text NOT NULL,
--   region text,
--   city text,
--   barangay text,
--   zip text,
--   total_lockers integer NOT NULL DEFAULT 0,
--   code text
-- );
CREATE TABLE mailroom_schema.mailroom_address_table (
  mailroom_address_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mailroom_address_region TEXT,
  mailroom_address_city TEXT,
  mailroom_address_barangay TEXT,
  mailroom_address_zip TEXT,
  mailroom_address_code TEXT
);

-- CREATE TABLE public.location_lockers (
--   id uuid NOT NULL DEFAULT gen_random_uuid(),
--   location_id uuid NOT NULL, -- FK → references mailroom_locations(id)
--   locker_code text NOT NULL,
--   is_available boolean DEFAULT true,
--   created_at timestamptz DEFAULT now()
-- );
CREATE TABLE mailroom_schema.mailroom_locker_table (
  mailroom_locker_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mailroom_address_id UUID NOT NULL, -- fk to mailroom_schema.mailroom_address_table(mailroom_address_id)
  mailroom_locker_code TEXT NOT NULL,
  mailroom_locker_is_available BOOLEAN DEFAULT true,
  mailroom_locker_created_at TIMESTAMPTZ DEFAULT NOW()
);

--Create Mailroom  Registration Table
-- CREATE TABLE public.mailroom_registrations (
--   id uuid NOT NULL DEFAULT gen_random_uuid(),
--   user_id uuid NOT NULL, -- FK → references users(id)
--   location_id uuid NOT NULL, -- FK → references mailroom_locations(id)
--   plan_id uuid NOT NULL, -- FK → references mailroom_plans(id)
--   locker_qty integer NOT NULL,
--   months integer NOT NULL,
--   notes text,
--   created_at timestamp without time zone NOT NULL DEFAULT now(),
--   full_name text NOT NULL,
--   email text NOT NULL,
--   mobile text NOT NULL,
--   mailroom_status boolean DEFAULT true,
--   mailroom_code text,
--   auto_renew boolean DEFAULT true,
--   order_id text,
--   paid boolean DEFAULT false,
--   paymongo_payment_id text
-- );
CREATE TABLE mailroom_schema.mailroom_registration_table (
  mailroom_registration_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, --fk to user_schema.user_table(user_id)
  mailroom_address_id UUID NOT NULL, --fk mailroom_schema.mailroom_address_table(mailroom_address_id)
  mailroom_plan_id UUID NOT NULL, 

  mailroom_registration_locker_qty INTEGER NOT NULL, 
  mailroom_registration_months INTEGER NOT NULL,

  mailroom_registration_notes TEXT,
  mailroom_registration_created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  mailroom_registration_status BOOLEAN DEFAULT true,
  mailroom_registration_code TEXT UNIQUE,
  mailroom_registration_auto_renew BOOLEAN DEFAULT true,
  mailroom_registration_order_id TEXT UNIQUE,
  mailroom_registration_paid BOOLEAN DEFAULT false,
  -- paymongo_payment_id TEXT -- x needed
);

-- CREATE TABLE public.mailroom_assigned_lockers (
--   id uuid NOT NULL DEFAULT gen_random_uuid(),
--   registration_id uuid NOT NULL, -- FK → references mailroom_registrations(id)
--   locker_id uuid NOT NULL, -- FK → references location_lockers(id)
--   assigned_at timestamptz DEFAULT now(),
--   status text NOT NULL DEFAULT 'Normal' -- CHECK: ['Empty', 'Normal', 'Near Full', 'Full']
-- );
CREATE TABLE mailroom_schema.mailroom_assigned_locker_table (
  mailroom_assigned_locker_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mailroom_registration_id UUID NOT NULL, -- fk to mailroom_schema.mailroom_registration_table(mailroom_registration_id)
  mailroom_locker_id UUID NOT NULL, -- fk to mailroom_schema.mailroom_locker_table(mailroom_locker_id)
  mailroom_assigned_locker_assigned_at TIMESTAMPTZ DEFAULT NOW(),
  mailroom_assigned_locker_status locker_status NOT NULL DEFAULT 'NORMAL'
);

-- public.mailroom_packages
-- CREATE TABLE public.mailroom_packages (
--   id uuid NOT NULL DEFAULT gen_random_uuid(),
--   registration_id uuid NOT NULL, -- FK → references mailroom_registrations(id)
--   package_type text NOT NULL, -- CHECK: ['Document', 'Parcel']
--   status text NOT NULL DEFAULT 'STORED', -- CHECK: ['STORED','RELEASED','RETRIEVED','DISPOSED','REQUEST_TO_RELEASE','REQUEST_TO_DISPOSE','REQUEST_TO_SCAN']
--   notes text,
--   image_url text,
--   mailroom_full boolean DEFAULT false,
--   received_at timestamptz DEFAULT now(),
--   locker_id uuid, -- FK → references location_lockers(id)
--   release_proof_url text,
--   release_to_name text,
--   release_address text,
--   release_address_id uuid,
--   package_name text,
--   package_photo text
-- );
CREATE TABLE mailroom_schema.mailroom_item_table (
  mailroom_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- mailroom_registration_id UUID NOT NULL, -- x needed
  mailroom_assigned_locker_id UUID NOT NULL, -- fk to mailroom_schema.mailroom_assigned_locker_table(mailroom_assigned_locker_id)
  mailroom_item_type mailroom_item_type NOT NULL,
  mailroom_item_status mailroom_item_status NOT NULL DEFAULT 'STORED',
  mailroom_item_received_at TIMESTAMPTZ DEFAULT NOW(),
  -- location_locker_id UUID, -- redundant
  mailroom_item_name TEXT,
  mailroom_sender_name TEXT,
  mailroom_created_at TIMESTAMPTZ DEFAULT NOW(),
  mailroom_updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE mailroom_schema.mailroom_item_request_action_table (
  mailroom_item_request_action_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mailroom_item_id UUID NOT NULL, -- fk to mailroom_schema.mailroom_item_table(mailroom_item_id)
  mailroom_item_request_action_type request_type,
  mailroom_item_request_status request_status,
  mailroom_item_request_action_notes TEXT, -- (deliver to, etc.)
  mailroom_item_request_action_created_at TIMESTAMPTZ DEFAULT NOW(),
  mailroom_item_request_action_updated_at TIMESTAMPTZ DEFAULT NOW()
)

-- Billing Schema Tables
CREATE TABLE billing_schema.paymongo_payment_table (
  paymongo_payment_id TEXT PRIMARY KEY,
  paymongo_payment_source_id TEXT,
  paymongo_payment_order_id TEXT,
  paymongo_payment_status TEXT,
  paymongo_payment_amount INTEGER,
  paymongo_payment_currency TEXT,
  paymongo_payment_raw JSONB,
  paymongo_payment_created_at TIMESTAMPTZ DEFAULT NOW(),
  paymongo_payment_updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Billing Schema Tables w/out JSONB
CREATE TABLE billing_schema.paymongo_payment_table (
  paymongo_payment_id TEXT PRIMARY KEY,
  paymongo_payment_intent_id TEXT,
  paymongo_payment_source_id TEXT,
  paymongo_payment_order_id TEXT,
  paymongo_payment_status TEXT NOT NULL,
  paymongo_payment_payment_method payment_method NOT NULL, 
  paymongo_payment_amount INTEGER NOT NULL, -- cents
  paymongo_payment_currency TEXT NOT NULL DEFAULT 'PHP',
  paymongo_payment_fee INTEGER,
  paymongo_payment_net_amount INTEGER,
  paymongo_payment_billing_name TEXT,
  paymongo_payment_billing_email TEXT,
  paymongo_payment_billing_phone TEXT,
  paymongo_payment_card_brand TEXT,
  paymongo_payment_card_last4 TEXT,
  paymongo_payment_livemode BOOLEAN NOT NULL,
  paymongo_payment_paid_at TIMESTAMPTZ,
  paymongo_payment_created_at TIMESTAMPTZ NOT NULL,
  paymongo_payment_updated_at TIMESTAMPTZ NOT NULL
);


-- Grant permissions on public schema
GRANT ALL ON ALL TABLES IN SCHEMA public TO public;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Grant permissions on user_schema
GRANT ALL ON ALL TABLES IN SCHEMA user_schema TO public;
GRANT ALL ON ALL TABLES IN SCHEMA user_schema TO postgres;
GRANT ALL ON SCHEMA user_schema TO postgres;
GRANT ALL ON SCHEMA user_schema TO public;

-- Grant permissions on mailroom_schema
GRANT ALL ON ALL TABLES IN SCHEMA mailroom_schema TO public;
GRANT ALL ON ALL TABLES IN SCHEMA mailroom_schema TO postgres;
GRANT ALL ON SCHEMA mailroom_schema TO postgres;
GRANT ALL ON SCHEMA mailroom_schema TO public;

-- Grant permissions on billing_schema
GRANT ALL ON ALL TABLES IN SCHEMA billing_schema TO public;
GRANT ALL ON ALL TABLES IN SCHEMA billing_schema TO postgres;
GRANT ALL ON SCHEMA billing_schema TO postgres;
GRANT ALL ON SCHEMA billing_schema TO public;

-- Grant permissions on attachment_schema
GRANT ALL ON ALL TABLES IN SCHEMA attachment_schema TO public;
GRANT ALL ON ALL TABLES IN SCHEMA attachment_schema TO postgres;
GRANT ALL ON SCHEMA attachment_schema TO postgres;
GRANT ALL ON SCHEMA attachment_schema TO public;

-- Grant permissions on status_schema
GRANT ALL ON ALL TABLES IN SCHEMA status_schema TO public;
GRANT ALL ON ALL TABLES IN SCHEMA status_schema TO postgres;
GRANT ALL ON SCHEMA status_schema TO postgres;
GRANT ALL ON SCHEMA status_schema TO public;

-- Grant permissions on referral_schema
GRANT ALL ON ALL TABLES IN SCHEMA referral_schema TO public;
GRANT ALL ON ALL TABLES IN SCHEMA referral_schema TO postgres;
GRANT ALL ON SCHEMA referral_schema TO postgres;
GRANT ALL ON SCHEMA referral_schema TO public;

-- Grant permissions on notification_schema
GRANT ALL ON ALL TABLES IN SCHEMA notification_schema TO public;
GRANT ALL ON ALL TABLES IN SCHEMA notification_schema TO postgres;
GRANT ALL ON SCHEMA notification_schema TO postgres;
GRANT ALL ON SCHEMA notification_schema TO public;
