-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.activity_log_table (
  activity_log_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  activity_action USER-DEFINED NOT NULL,
  activity_type USER-DEFINED NOT NULL,
  activity_entity_type USER-DEFINED,
  activity_entity_id uuid,
  activity_details jsonb NOT NULL,
  activity_ip_address text,
  activity_created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT activity_log_table_pkey PRIMARY KEY (activity_log_id),
  CONSTRAINT activity_log_table_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users_table(users_id)
);
CREATE TABLE public.error_log_table (
  error_log_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  error_type USER-DEFINED NOT NULL,
  error_message text NOT NULL,
  error_code USER-DEFINED,
  error_stack text,
  request_path text,
  request_method text,
  request_body jsonb,
  request_headers jsonb,
  response_status integer,
  error_details jsonb,
  ip_address text,
  user_agent text,
  error_resolved boolean DEFAULT false,
  error_resolved_at timestamp with time zone,
  error_resolved_by uuid,
  error_resolution_notes text,
  error_created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT error_log_table_pkey PRIMARY KEY (error_log_id),
  CONSTRAINT error_log_table_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users_table(users_id),
  CONSTRAINT error_log_table_error_resolved_by_fkey FOREIGN KEY (error_resolved_by) REFERENCES public.users_table(users_id)
);
CREATE TABLE public.location_locker_table (
  location_locker_id uuid NOT NULL DEFAULT gen_random_uuid(),
  mailroom_location_id uuid NOT NULL,
  location_locker_code text NOT NULL,
  location_locker_is_available boolean DEFAULT true,
  location_locker_created_at timestamp with time zone DEFAULT now(),
  location_locker_deleted_at timestamp with time zone,
  CONSTRAINT location_locker_table_pkey PRIMARY KEY (location_locker_id),
  CONSTRAINT location_locker_table_mailroom_location_id_fkey FOREIGN KEY (mailroom_location_id) REFERENCES public.mailroom_location_table(mailroom_location_id)
);
CREATE TABLE public.mail_action_request_table (
  mail_action_request_id uuid NOT NULL DEFAULT gen_random_uuid(),
  mailbox_item_id uuid NOT NULL,
  user_id uuid NOT NULL,
  mail_action_request_type USER-DEFINED NOT NULL,
  mail_action_request_status USER-DEFINED NOT NULL DEFAULT 'PROCESSING'::mail_action_request_status,
  mail_action_request_forward_address text,
  mail_action_request_forward_tracking_number text,
  mail_action_request_forward_3pl_name text,
  mail_action_request_forward_tracking_url text,
  mail_action_request_processed_at timestamp with time zone,
  mail_action_request_processed_by uuid,
  mail_action_request_completed_at timestamp with time zone,
  mail_action_request_created_at timestamp with time zone DEFAULT now(),
  mail_action_request_updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT mail_action_request_table_pkey PRIMARY KEY (mail_action_request_id),
  CONSTRAINT mail_action_request_table_mailbox_item_id_fkey FOREIGN KEY (mailbox_item_id) REFERENCES public.mailbox_item_table(mailbox_item_id),
  CONSTRAINT mail_action_request_table_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users_table(users_id),
  CONSTRAINT mail_action_request_table_mail_action_request_processed_by_fkey FOREIGN KEY (mail_action_request_processed_by) REFERENCES public.users_table(users_id)
);
CREATE TABLE public.mailbox_item_table (
  mailbox_item_id uuid NOT NULL DEFAULT gen_random_uuid(),
  mailroom_registration_id uuid NOT NULL,
  mailbox_item_type USER-DEFINED NOT NULL,
  mailbox_item_status USER-DEFINED NOT NULL DEFAULT 'STORED'::mailroom_package_status,
  mailbox_item_received_at timestamp with time zone DEFAULT now(),
  location_locker_id uuid,
  mailbox_item_release_address text,
  user_address_id uuid,
  mailbox_item_name text,
  mailbox_item_photo text,
  mailbox_item_created_at timestamp with time zone DEFAULT now(),
  mailbox_item_updated_at timestamp with time zone DEFAULT now(),
  mailbox_item_deleted_at timestamp with time zone,
  CONSTRAINT mailbox_item_table_pkey PRIMARY KEY (mailbox_item_id),
  CONSTRAINT mailbox_item_table_mailroom_registration_id_fkey FOREIGN KEY (mailroom_registration_id) REFERENCES public.mailroom_registration_table(mailroom_registration_id),
  CONSTRAINT mailbox_item_table_location_locker_id_fkey FOREIGN KEY (location_locker_id) REFERENCES public.location_locker_table(location_locker_id),
  CONSTRAINT mailbox_item_table_user_address_id_fkey FOREIGN KEY (user_address_id) REFERENCES public.user_address_table(user_address_id)
);
CREATE TABLE public.mailroom_assigned_locker_table (
  mailroom_assigned_locker_id uuid NOT NULL DEFAULT gen_random_uuid(),
  mailroom_registration_id uuid NOT NULL,
  location_locker_id uuid NOT NULL UNIQUE,
  mailroom_assigned_locker_assigned_at timestamp with time zone DEFAULT now(),
  mailroom_assigned_locker_status USER-DEFINED NOT NULL DEFAULT 'Normal'::mailroom_assigned_locker_status,
  CONSTRAINT mailroom_assigned_locker_table_pkey PRIMARY KEY (mailroom_assigned_locker_id),
  CONSTRAINT mailroom_assigned_locker_table_mailroom_registration_id_fkey FOREIGN KEY (mailroom_registration_id) REFERENCES public.mailroom_registration_table(mailroom_registration_id),
  CONSTRAINT mailroom_assigned_locker_table_location_locker_id_fkey FOREIGN KEY (location_locker_id) REFERENCES public.location_locker_table(location_locker_id)
);
CREATE TABLE public.mailroom_file_table (
  mailroom_file_id uuid NOT NULL DEFAULT gen_random_uuid(),
  mailbox_item_id uuid NOT NULL,
  mailroom_file_name text NOT NULL,
  mailroom_file_url text NOT NULL,
  mailroom_file_size_mb numeric NOT NULL DEFAULT 0,
  mailroom_file_mime_type text,
  mailroom_file_uploaded_at timestamp with time zone DEFAULT now(),
  mailroom_file_type USER-DEFINED NOT NULL,
  CONSTRAINT mailroom_file_table_pkey PRIMARY KEY (mailroom_file_id),
  CONSTRAINT mailroom_file_table_mailbox_item_id_fkey FOREIGN KEY (mailbox_item_id) REFERENCES public.mailbox_item_table(mailbox_item_id)
);
CREATE TABLE public.mailroom_location_table (
  mailroom_location_id uuid NOT NULL DEFAULT gen_random_uuid(),
  mailroom_location_name text NOT NULL,
  mailroom_location_region text,
  mailroom_location_city text,
  mailroom_location_barangay text,
  mailroom_location_zip text,
  mailroom_location_total_lockers integer NOT NULL DEFAULT 0,
  mailroom_location_prefix text,
  CONSTRAINT mailroom_location_table_pkey PRIMARY KEY (mailroom_location_id)
);
CREATE TABLE public.mailroom_plan_table (
  mailroom_plan_id uuid NOT NULL DEFAULT gen_random_uuid(),
  mailroom_plan_name text NOT NULL,
  mailroom_plan_price numeric NOT NULL,
  mailroom_plan_description text,
  mailroom_plan_storage_limit numeric,
  mailroom_plan_can_receive_mail boolean DEFAULT true,
  mailroom_plan_can_receive_parcels boolean DEFAULT false,
  mailroom_plan_can_digitize boolean DEFAULT true,
  CONSTRAINT mailroom_plan_table_pkey PRIMARY KEY (mailroom_plan_id)
);
CREATE TABLE public.mailroom_registration_table (
  mailroom_registration_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mailroom_location_id uuid,
  mailroom_plan_id uuid NOT NULL,
  mailroom_registration_code text UNIQUE,
  mailroom_registration_status boolean DEFAULT true,
  mailroom_registration_created_at timestamp with time zone NOT NULL DEFAULT now(),
  mailroom_registration_updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT mailroom_registration_table_pkey PRIMARY KEY (mailroom_registration_id),
  CONSTRAINT mailroom_registration_table_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users_table(users_id),
  CONSTRAINT mailroom_registration_table_mailroom_location_id_fkey FOREIGN KEY (mailroom_location_id) REFERENCES public.mailroom_location_table(mailroom_location_id),
  CONSTRAINT mailroom_registration_table_mailroom_plan_id_fkey FOREIGN KEY (mailroom_plan_id) REFERENCES public.mailroom_plan_table(mailroom_plan_id)
);
CREATE TABLE public.notification_table (
  notification_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  notification_title text NOT NULL,
  notification_message text NOT NULL,
  notification_type USER-DEFINED,
  notification_is_read boolean DEFAULT false,
  notification_link text,
  notification_created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT notification_table_pkey PRIMARY KEY (notification_id),
  CONSTRAINT notification_table_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users_table(users_id)
);
CREATE TABLE public.payment_transaction_table (
  payment_transaction_id uuid NOT NULL DEFAULT gen_random_uuid(),
  mailroom_registration_id uuid NOT NULL,
  payment_transaction_amount numeric NOT NULL,
  payment_transaction_status USER-DEFINED NOT NULL DEFAULT 'PENDING'::payment_status,
  payment_transaction_date timestamp with time zone DEFAULT now(),
  payment_transaction_method text,
  payment_transaction_type USER-DEFINED NOT NULL,
  payment_transaction_reference_id text,
  payment_transaction_channel text DEFAULT 'paymongo'::text,
  payment_transaction_reference text,
  payment_transaction_order_id text UNIQUE,
  payment_transaction_created_at timestamp with time zone DEFAULT now(),
  payment_transaction_updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payment_transaction_table_pkey PRIMARY KEY (payment_transaction_id),
  CONSTRAINT payment_transaction_table_mailroom_registration_id_fkey FOREIGN KEY (mailroom_registration_id) REFERENCES public.mailroom_registration_table(mailroom_registration_id)
);
CREATE TABLE public.referral_table (
  referral_id integer NOT NULL DEFAULT nextval('referral_table_referral_id_seq'::regclass),
  referral_referrer_user_id uuid,
  referral_referred_user_id uuid,
  referral_service_type text,
  referral_date_created timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT referral_table_pkey PRIMARY KEY (referral_id),
  CONSTRAINT referral_table_referral_referrer_user_id_fkey FOREIGN KEY (referral_referrer_user_id) REFERENCES public.users_table(users_id),
  CONSTRAINT referral_table_referral_referred_user_id_fkey FOREIGN KEY (referral_referred_user_id) REFERENCES public.users_table(users_id)
);
CREATE TABLE public.rewards_claim_table (
  rewards_claim_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  rewards_claim_payment_method text NOT NULL,
  rewards_claim_account_details text NOT NULL,
  rewards_claim_amount numeric NOT NULL DEFAULT 500.00,
  rewards_claim_status USER-DEFINED NOT NULL DEFAULT 'PENDING'::rewards_claim_status,
  rewards_claim_referral_count integer NOT NULL,
  rewards_claim_created_at timestamp with time zone NOT NULL DEFAULT now(),
  rewards_claim_processed_at timestamp with time zone,
  rewards_claim_proof_path text,
  rewards_claim_total_referrals integer,
  CONSTRAINT rewards_claim_table_pkey PRIMARY KEY (rewards_claim_id),
  CONSTRAINT rewards_claim_table_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users_table(users_id)
);
CREATE TABLE public.subscription_table (
  subscription_id uuid NOT NULL DEFAULT gen_random_uuid(),
  mailroom_registration_id uuid NOT NULL UNIQUE,
  subscription_billing_cycle USER-DEFINED NOT NULL DEFAULT 'MONTHLY'::billing_cycle,
  subscription_auto_renew boolean DEFAULT true,
  subscription_started_at timestamp with time zone NOT NULL DEFAULT now(),
  subscription_expires_at timestamp with time zone NOT NULL,
  subscription_created_at timestamp with time zone DEFAULT now(),
  subscription_updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT subscription_table_pkey PRIMARY KEY (subscription_id),
  CONSTRAINT subscription_table_mailroom_registration_id_fkey FOREIGN KEY (mailroom_registration_id) REFERENCES public.mailroom_registration_table(mailroom_registration_id)
);
CREATE TABLE public.user_address_table (
  user_address_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_address_label text,
  user_address_line1 text NOT NULL,
  user_address_line2 text,
  user_address_city text,
  user_address_region text,
  user_address_postal text,
  user_address_is_default boolean DEFAULT false,
  user_address_created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_address_table_pkey PRIMARY KEY (user_address_id),
  CONSTRAINT user_address_table_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users_table(users_id)
);
CREATE TABLE public.user_kyc_address_table (
  user_kyc_address_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_kyc_id uuid NOT NULL,
  user_kyc_address_line_one text,
  user_kyc_address_line_two text,
  user_kyc_address_city text,
  user_kyc_address_region text,
  user_kyc_address_postal_code integer,
  user_kyc_address_is_default boolean DEFAULT false,
  user_kyc_address_created_at timestamp with time zone DEFAULT now(),
  user_kyc_address_updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_kyc_address_table_pkey PRIMARY KEY (user_kyc_address_id),
  CONSTRAINT user_kyc_address_table_user_kyc_id_fkey FOREIGN KEY (user_kyc_id) REFERENCES public.user_kyc_table(user_kyc_id)
);
CREATE TABLE public.user_kyc_table (
  user_kyc_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  user_kyc_status USER-DEFINED NOT NULL DEFAULT 'SUBMITTED'::user_kyc_status,
  user_kyc_id_front_url text NOT NULL,
  user_kyc_id_back_url text NOT NULL,
  user_kyc_id_number character varying,
  user_kyc_submitted_at timestamp with time zone DEFAULT now(),
  user_kyc_verified_at timestamp with time zone,
  user_kyc_created_at timestamp with time zone DEFAULT now(),
  user_kyc_updated_at timestamp with time zone DEFAULT now(),
  user_kyc_id_document_type text,
  user_kyc_first_name text,
  user_kyc_last_name text,
  user_kyc_date_of_birth date,
  user_kyc_agreements_accepted boolean DEFAULT false,
  user_kyc_rejected_reason text,
  CONSTRAINT user_kyc_table_pkey PRIMARY KEY (user_kyc_id),
  CONSTRAINT user_kyc_table_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users_table(users_id)
);
CREATE TABLE public.users_table (
  users_id uuid NOT NULL DEFAULT gen_random_uuid(),
  users_email text NOT NULL UNIQUE,
  users_role text NOT NULL DEFAULT 'user'::text,
  users_created_at timestamp with time zone DEFAULT now(),
  users_avatar_url text,
  users_is_verified boolean DEFAULT false,
  users_referral_code text,
  mobile_number text,
  referral_reward_milestone_claimed integer DEFAULT 0,
  CONSTRAINT users_table_pkey PRIMARY KEY (users_id)
);