-- Remove all policies for files
DROP POLICY IF EXISTS objects_policy ON storage.objects;
DROP POLICY IF EXISTS buckets_policy ON storage.buckets;

-- Delete file buckets created and files uploaded
DELETE FROM storage.objects;
DELETE FROM storage.buckets;

-- Start storage
INSERT INTO storage.buckets (id, name, public) VALUES
('USER-KYC-DOCUMENTS', 'USER-KYC-DOCUMENTS', true);

-- User KYC Status
CREATE TYPE user_kyc_status AS ENUM ('SUBMITTED', 'VERIFIED', 'REJECTED');

-- Mailroom Package Status
CREATE TYPE mailroom_package_status AS ENUM ('STORED', 'RELEASED', 'RETRIEVED', 'DISPOSED', 'REQUEST_TO_RELEASE', 'REQUEST_TO_DISPOSE', 'REQUEST_TO_SCAN');

-- Mailroom Assigned Locker Status
CREATE TYPE mailroom_assigned_locker_status AS ENUM ('Empty', 'Normal', 'Near Full', 'Full');

-- Rewards Claim Status
CREATE TYPE rewards_claim_status AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'REJECTED');

-- Notification Type
CREATE TYPE notification_type AS ENUM ('PACKAGE_ARRIVED', 'PACKAGE_RELEASED', 'PACKAGE_DISPOSED', 'SCAN_READY', 'SYSTEM', 'REWARD_PROCESSING', 'REWARD_PAID');

-- Package Type
CREATE TYPE mailroom_package_type AS ENUM ('Document', 'Parcel');

-- Billing Cycle
CREATE TYPE billing_cycle AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUAL');

-- Payment Status
CREATE TYPE payment_status AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'REFUNDED');

-- Payment Type
CREATE TYPE payment_type AS ENUM ('SUBSCRIPTION', 'ONE_TIME', 'REFUND');

-- Mail Action Request Status
CREATE TYPE mail_action_request_status AS ENUM ('PROCESSING', 'COMPLETED');

-- Mail Action Request Type
CREATE TYPE mail_action_request_type AS ENUM ('SCAN', 'RELEASE', 'DISPOSE', 'CANCEL', 'REFUND', 'REWARD', 'OTHER');

-- Mailroom File Type
CREATE TYPE mailroom_file_type AS ENUM ('RECEIVED', 'SCANNED', 'RELEASED');

-- Activity Type
CREATE TYPE activity_type AS ENUM ('USER_REQUEST_SCAN', 'USER_REQUEST_RELEASE', 'USER_REQUEST_DISPOSE', 'USER_REQUEST_CANCEL', 'USER_REQUEST_REFUND', 'USER_REQUEST_REWARD', 'USER_REQUEST_OTHERS', 'USER_LOGIN', 'USER_LOGOUT', 'USER_UPDATE_PROFILE', 'USER_KYC_SUBMIT', 'USER_KYC_VERIFY', 'ADMIN_ACTION', 'SYSTEM_EVENT');

-- Activity Entity Type
CREATE TYPE activity_entity_type AS ENUM ('MAIL_ACTION_REQUEST', 'USER_KYC', 'PAYMENT_TRANSACTION', 'SUBSCRIPTION', 'MAILBOX_ITEM', 'MAILROOM_REGISTRATION', 'USER_ADDRESS', 'REWARDS_CLAIM', 'REFERRAL', 'NOTIFICATION', 'MAILROOM_FILE', 'MAILROOM_ASSIGNED_LOCKER', 'USER');

-- Activity Action
CREATE TYPE activity_action AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'VIEW', 'SUBMIT', 'APPROVE', 'REJECT', 'PROCESS', 'COMPLETE', 'CANCEL', 'VERIFY', 'PAY', 'REFUND', 'LOGIN', 'LOGOUT', 'REGISTER', 'CLAIM', 'RELEASE', 'DISPOSE', 'SCAN');

-- Error Type
CREATE TYPE error_type AS ENUM ('API_ERROR', 'DATABASE_ERROR', 'VALIDATION_ERROR', 'AUTHENTICATION_ERROR', 'AUTHORIZATION_ERROR', 'PAYMENT_ERROR', 'EXTERNAL_SERVICE_ERROR', 'SYSTEM_ERROR', 'UNKNOWN_ERROR');

-- Error Code
CREATE TYPE error_code AS ENUM (
  -- Authentication & Authorization Errors
  'AUTH_401_UNAUTHORIZED',
  'AUTH_403_FORBIDDEN',
  'AUTH_TOKEN_EXPIRED',
  'AUTH_TOKEN_INVALID',
  'AUTH_SESSION_NOT_FOUND',
  'AUTH_USER_NOT_FOUND',
  'AUTH_INVALID_CREDENTIALS',
  'AUTH_EMAIL_NOT_VERIFIED',
  
  -- Database Errors
  'DB_CONN_TIMEOUT',
  'DB_QUERY_ERROR',
  'DB_CONSTRAINT_VIOLATION',
  'DB_FOREIGN_KEY_VIOLATION',
  'DB_UNIQUE_VIOLATION',
  'DB_TRANSACTION_FAILED',
  'DB_CONNECTION_LOST',
  
  -- Validation Errors
  'VALIDATION_EMAIL_REQUIRED',
  'VALIDATION_EMAIL_INVALID',
  'VALIDATION_MOBILE_REQUIRED',
  'VALIDATION_MOBILE_INVALID',
  'VALIDATION_PASSWORD_REQUIRED',
  'VALIDATION_PASSWORD_TOO_WEAK',
  'VALIDATION_FIELD_REQUIRED',
  'VALIDATION_INVALID_FORMAT',
  'VALIDATION_INVALID_VALUE',
  'VALIDATION_REFERRAL_CODE_INVALID',
  'VALIDATION_SELF_REFERRAL_NOT_ALLOWED',
  
  -- KYC Errors
  'KYC_NOT_SUBMITTED',
  'KYC_PENDING_VERIFICATION',
  'KYC_REJECTED',
  'KYC_ALREADY_VERIFIED',
  'KYC_DOCUMENT_MISSING',
  'KYC_DOCUMENT_INVALID',
  
  -- Mailroom Errors
  'MAILROOM_LOCATION_NOT_FOUND',
  'MAILROOM_LOCKER_NOT_AVAILABLE',
  'MAILROOM_LOCKER_QUANTITY_EXCEEDED',
  'MAILROOM_REGISTRATION_NOT_FOUND',
  'MAILROOM_PLAN_NOT_FOUND',
  'MAILROOM_ITEM_NOT_FOUND',
  'MAILROOM_ACTION_REQUEST_INVALID',
  'MAILROOM_ACTION_REQUEST_NOT_ALLOWED',
  'MAILROOM_LOCKER_FULL',
  
  -- Payment Errors
  'PAYMENT_TRANSACTION_FAILED',
  'PAYMENT_INSUFFICIENT_FUNDS',
  'PAYMENT_METHOD_INVALID',
  'PAYMENT_GATEWAY_ERROR',
  'PAYMENT_REFUND_FAILED',
  'PAYMENT_ALREADY_PROCESSED',
  'PAYMENT_AMOUNT_INVALID',
  
  -- Subscription Errors
  'SUBSCRIPTION_NOT_FOUND',
  'SUBSCRIPTION_EXPIRED',
  'SUBSCRIPTION_ALREADY_ACTIVE',
  'SUBSCRIPTION_CANCEL_FAILED',
  'SUBSCRIPTION_RENEWAL_FAILED',
  
  -- Referral Errors
  'REFERRAL_CODE_NOT_FOUND',
  'REFERRAL_CODE_ALREADY_USED',
  'REFERRAL_SELF_REFERRAL',
  'REFERRAL_INVALID',
  
  -- Rewards Errors
  'REWARD_CLAIM_NOT_ELIGIBLE',
  'REWARD_CLAIM_MINIMUM_NOT_MET',
  'REWARD_CLAIM_ALREADY_PROCESSED',
  'REWARD_CLAIM_PAYMENT_FAILED',
  'REWARD_CLAIM_NOT_FOUND',
  
  -- User Address Errors
  'ADDRESS_NOT_FOUND',
  'ADDRESS_INVALID',
  'ADDRESS_REQUIRED',
  
  -- File/Upload Errors
  'FILE_UPLOAD_FAILED',
  'FILE_SIZE_EXCEEDED',
  'FILE_TYPE_INVALID',
  'FILE_NOT_FOUND',
  
  -- External Service Errors
  'EXTERNAL_SERVICE_TIMEOUT',
  'EXTERNAL_SERVICE_UNAVAILABLE',
  'EXTERNAL_SERVICE_ERROR',
  
  -- System Errors
  'SYSTEM_INTERNAL_ERROR',
  'SYSTEM_MAINTENANCE',
  'SYSTEM_RATE_LIMIT_EXCEEDED'
);


-- Users
CREATE TABLE users_table (
  users_id UUID NOT NULL DEFAULT gen_random_uuid(),
  users_email TEXT NOT NULL UNIQUE,
  users_role TEXT NOT NULL DEFAULT 'user',
  users_created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  users_avatar_url TEXT,
  users_is_verified BOOLEAN DEFAULT false,
  users_referral_code TEXT,
  mobile_number TEXT,
  CONSTRAINT users_table_pkey PRIMARY KEY (users_id)
);

CREATE TABLE user_kyc_table (
  user_kyc_id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users_table(users_id),
  user_kyc_status user_kyc_status NOT NULL DEFAULT 'SUBMITTED',
  user_kyc_id_front_url TEXT NOT NULL,
  user_kyc_id_back_url TEXT NOT NULL,
  user_kyc_submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_kyc_verified_at TIMESTAMP WITH TIME ZONE,
  user_kyc_created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_kyc_updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_kyc_id_document_type TEXT,
  user_kyc_first_name TEXT,
  user_kyc_last_name TEXT,
  user_kyc_date_of_birth DATE,
  user_kyc_agreements_accepted BOOLEAN DEFAULT false,
  user_kyc_rejected_reason TEXT,
  CONSTRAINT user_kyc_table_pkey PRIMARY KEY (user_kyc_id)
);

CREATE TABLE user_kyc_address_table (
  user_kyc_address_id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_kyc_id UUID NOT NULL REFERENCES user_kyc_table(user_kyc_id) ON DELETE CASCADE,
  user_kyc_address_line_one TEXT,
  user_kyc_address_line_two TEXT,
  user_kyc_address_city TEXT,
  user_kyc_address_region TEXT,
  user_kyc_address_postal_code INTEGER,
  user_kyc_address_is_default BOOLEAN DEFAULT false,
  user_kyc_address_created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_kyc_address_updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT user_kyc_address_table_pkey PRIMARY KEY (user_kyc_address_id)
);


-- User Addresses (one-to-many with Users)
-- forward address 
CREATE TABLE user_address_table (
  user_address_id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users_table(users_id),
  user_address_label TEXT, -- home, office, etc.
  user_address_line1 TEXT NOT NULL, -- street, building, etc.
  user_address_line2 TEXT, -- unit, landmark, etc.
  user_address_city TEXT, -- city
  user_address_region TEXT, -- region
  user_address_postal TEXT, -- postal code
  user_address_is_default BOOLEAN DEFAULT false,
  user_address_created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT user_address_table_pkey PRIMARY KEY (user_address_id)
); 

-- all good for this one
CREATE TABLE mailroom_location_table (
  mailroom_location_id UUID NOT NULL DEFAULT gen_random_uuid(),
  mailroom_location_name TEXT NOT NULL,
  mailroom_location_region TEXT,
  mailroom_location_city TEXT,
  mailroom_location_barangay TEXT,
  mailroom_location_zip TEXT,
  mailroom_location_total_lockers INTEGER NOT NULL DEFAULT 0,
  mailroom_location_prefix TEXT,
  CONSTRAINT mailroom_location_table_pkey PRIMARY KEY (mailroom_location_id)
);

-- Lockers (one-to-many with Mailroom Locations)
CREATE TABLE location_locker_table (
  location_locker_id UUID NOT NULL DEFAULT gen_random_uuid(),
  mailroom_location_id UUID NOT NULL REFERENCES mailroom_location_table(mailroom_location_id),
  location_locker_code TEXT NOT NULL,
  location_locker_is_available BOOLEAN DEFAULT true,
  location_locker_created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT location_locker_table_pkey PRIMARY KEY (location_locker_id)
);

-- Mailroom Plans (packages)
CREATE TABLE mailroom_plan_table (
  mailroom_plan_id UUID NOT NULL DEFAULT gen_random_uuid(),
  mailroom_plan_name TEXT NOT NULL,
  mailroom_plan_price NUMERIC NOT NULL,
  mailroom_plan_description TEXT,
  mailroom_plan_storage_limit NUMERIC,
  mailroom_plan_can_receive_mail BOOLEAN DEFAULT true,
  mailroom_plan_can_receive_parcels BOOLEAN DEFAULT false,
  mailroom_plan_can_digitize BOOLEAN DEFAULT true,
  CONSTRAINT mailroom_plan_table_pkey PRIMARY KEY (mailroom_plan_id)
);

-- Mailroom Registrations (one-to-many with Users, Mailroom Locations, and Mailroom Plans)
CREATE TABLE mailroom_registration_table (
  mailroom_registration_id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users_table(users_id),
  mailroom_location_id UUID REFERENCES mailroom_location_table(mailroom_location_id),
  mailroom_plan_id UUID NOT NULL REFERENCES mailroom_plan_table(mailroom_plan_id),
  mailroom_registration_code TEXT UNIQUE,
  mailroom_registration_status BOOLEAN DEFAULT true,
  mailroom_registration_created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  mailroom_registration_updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT mailroom_registration_table_pkey PRIMARY KEY (mailroom_registration_id)
);

-- Subscriptions (one-to-one with Mailroom Registrations)
CREATE TABLE subscription_table (
  subscription_id UUID NOT NULL DEFAULT gen_random_uuid(),
  mailroom_registration_id UUID NOT NULL UNIQUE REFERENCES mailroom_registration_table(mailroom_registration_id),
  subscription_billing_cycle billing_cycle NOT NULL DEFAULT 'MONTHLY',
  subscription_auto_renew BOOLEAN DEFAULT true,
  subscription_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  subscription_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  subscription_created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  subscription_updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT subscription_table_pkey PRIMARY KEY (subscription_id)
);

-- Payment Transactions (one-to-many with Mailroom Registrations)
CREATE TABLE payment_transaction_table (
  payment_transaction_id UUID NOT NULL DEFAULT gen_random_uuid(),
  mailroom_registration_id UUID NOT NULL REFERENCES mailroom_registration_table(mailroom_registration_id),
  payment_transaction_amount NUMERIC NOT NULL,
  payment_transaction_status payment_status NOT NULL DEFAULT 'PENDING',
  payment_transaction_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  payment_transaction_method TEXT,
  payment_transaction_type payment_type NOT NULL,
  payment_transaction_reference_id TEXT,
  payment_transaction_channel TEXT DEFAULT 'paymongo', -- paymongo, xendit, paypal, dragonpay, etc.
  payment_transaction_reference TEXT,
  payment_transaction_order_id TEXT,
  payment_transaction_created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  payment_transaction_updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT payment_transaction_table_pkey PRIMARY KEY (payment_transaction_id)
);


-- Mailroom Assigned Lockers (one-to-one with Location Locker, one-to-many with Mailroom Registrations)
CREATE TABLE mailroom_assigned_locker_table (
  mailroom_assigned_locker_id UUID NOT NULL DEFAULT gen_random_uuid(),
  mailroom_registration_id UUID NOT NULL REFERENCES mailroom_registration_table(mailroom_registration_id),
  location_locker_id UUID NOT NULL UNIQUE REFERENCES location_locker_table(location_locker_id),
  mailroom_assigned_locker_assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  mailroom_assigned_locker_status mailroom_assigned_locker_status NOT NULL DEFAULT 'Normal', -- ENUM('Empty', 'Normal', 'Near Full', 'Full')
  CONSTRAINT mailroom_assigned_locker_table_pkey PRIMARY KEY (mailroom_assigned_locker_id)
);

-- Mailroom Packages (one-to-many with Mailroom Registrations, optional one-to-one with Locker)
CREATE TABLE mailbox_item_table (
  mailbox_item_id UUID NOT NULL DEFAULT gen_random_uuid(),
  mailroom_registration_id UUID NOT NULL REFERENCES mailroom_registration_table(mailroom_registration_id),
  mailbox_item_type mailroom_package_type NOT NULL,
  mailbox_item_status mailroom_package_status NOT NULL DEFAULT 'STORED',
  mailbox_item_received_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  location_locker_id UUID REFERENCES location_locker_table(location_locker_id),
  mailbox_item_release_address TEXT,
  user_address_id UUID REFERENCES user_address_table(user_address_id),
  mailbox_item_name TEXT,
  mailbox_item_photo TEXT,
  mailbox_item_created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  mailbox_item_updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT mailbox_item_table_pkey PRIMARY KEY (mailbox_item_id)
);

-- Mail Action Requests (one-to-many with Mailbox Items)
CREATE TABLE mail_action_request_table (
  mail_action_request_id UUID NOT NULL DEFAULT gen_random_uuid(),
  mailbox_item_id UUID NOT NULL REFERENCES mailbox_item_table(mailbox_item_id),
  user_id UUID NOT NULL REFERENCES users_table(users_id),
  mail_action_request_type mail_action_request_type NOT NULL,
  mail_action_request_status mail_action_request_status NOT NULL DEFAULT 'PROCESSING',
  mail_action_request_forward_address TEXT,
  mail_action_request_forward_tracking_number TEXT,
  mail_action_request_forward_3pl_name TEXT,
  mail_action_request_forward_tracking_url TEXT,
  mail_action_request_processed_at TIMESTAMP WITH TIME ZONE,
  mail_action_request_processed_by UUID REFERENCES users_table(users_id),
  mail_action_request_completed_at TIMESTAMP WITH TIME ZONE,
  mail_action_request_created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  mail_action_request_updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT mail_action_request_table_pkey PRIMARY KEY (mail_action_request_id)
);

-- Mailroom Files (one-to-many with Mailbox Items)
CREATE TABLE mailroom_file_table (
  mailroom_file_id UUID NOT NULL DEFAULT gen_random_uuid(),
  mailbox_item_id UUID NOT NULL REFERENCES mailbox_item_table(mailbox_item_id),
  mailroom_file_name TEXT NOT NULL,
  mailroom_file_url TEXT NOT NULL,
  mailroom_file_size_mb NUMERIC NOT NULL DEFAULT 0,
  mailroom_file_mime_type TEXT,
  mailroom_file_uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  mailroom_file_type mailroom_file_type NOT NULL,
  CONSTRAINT mailroom_file_table_pkey PRIMARY KEY (mailroom_file_id)
);

-- Notifications (one-to-many with Users)
CREATE TABLE notification_table (
  notification_id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users_table(users_id),
  notification_title TEXT NOT NULL,
  notification_message TEXT NOT NULL,
  notification_type notification_type,
  notification_is_read BOOLEAN DEFAULT false,
  notification_link TEXT,
  notification_created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT notification_table_pkey PRIMARY KEY (notification_id)
);


-- Referrals (one-to-many with Users)
CREATE TABLE referral_table (
  referral_id SERIAL PRIMARY KEY,
  referral_referrer_user_id UUID REFERENCES users_table(users_id),
  referral_referred_user_id UUID REFERENCES users_table(users_id),
  referral_service_type TEXT,
  referral_date_created TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Rewards Claims (one-to-many with Users)
CREATE TABLE rewards_claim_table (
  rewards_claim_id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users_table(users_id),
  rewards_claim_payment_method TEXT NOT NULL,
  rewards_claim_account_details TEXT NOT NULL,
  rewards_claim_amount NUMERIC NOT NULL DEFAULT 500.00,
  rewards_claim_status rewards_claim_status NOT NULL DEFAULT 'PENDING',
  rewards_claim_referral_count INTEGER NOT NULL,
  rewards_claim_created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  rewards_claim_processed_at TIMESTAMP WITH TIME ZONE,
  rewards_claim_proof_path TEXT,
  CONSTRAINT rewards_claim_table_pkey PRIMARY KEY (rewards_claim_id)
);

-- Activity Log (one-to-many with Users)
-- General-purpose audit table - tracks all user activities across the system
-- Related entity information is stored in activity_details JSONB field
CREATE TABLE activity_log_table (
  activity_log_id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users_table(users_id) ON DELETE CASCADE,
  activity_action activity_action NOT NULL,
  activity_type activity_type NOT NULL,
  activity_entity_type activity_entity_type, -- Optional: type of entity this activity relates to
  activity_entity_id UUID, -- Optional: ID of the related entity (no FK constraint for flexibility)
  activity_details JSONB NOT NULL, -- Stores full context: related entity IDs, request data, changes, etc.
  activity_ip_address TEXT,
  activity_created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT activity_log_table_pkey PRIMARY KEY (activity_log_id)
);

-- Error Log (standalone)
-- Tracks system errors, API errors, and exceptions for debugging and monitoring
CREATE TABLE error_log_table (
  error_log_id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users_table(users_id) ON DELETE SET NULL, -- Optional: user who triggered the error
  error_type error_type NOT NULL,
  error_message TEXT NOT NULL,
  error_code error_code, -- Predefined error code
  error_stack TEXT, -- Stack trace for exceptions
  request_path TEXT, -- API endpoint path
  request_method TEXT, -- HTTP method (GET, POST, etc.)
  request_body JSONB, -- Request body for debugging
  request_headers JSONB, -- Request headers
  response_status INTEGER, -- HTTP response status code
  error_details JSONB, -- Additional error context and metadata
  ip_address TEXT,
  user_agent TEXT,
  error_resolved BOOLEAN DEFAULT false,
  error_resolved_at TIMESTAMP WITH TIME ZONE,
  error_resolved_by UUID REFERENCES users_table(users_id), -- Admin who resolved the error
  error_resolution_notes TEXT,
  error_created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT error_log_table_pkey PRIMARY KEY (error_log_id)
);

-- Users
CREATE INDEX idx_users_referral_code ON users_table(users_referral_code);
CREATE INDEX idx_users_created_at ON users_table(users_created_at);

-- User KYC
CREATE INDEX idx_user_kyc_user_id ON user_kyc_table(user_id);
CREATE INDEX idx_user_kyc_status ON user_kyc_table(user_kyc_status);

-- User Addresses
CREATE INDEX idx_user_address_user_id ON user_address_table(user_id);
CREATE INDEX idx_user_address_is_default ON user_address_table(user_address_is_default);

-- Mailroom Locations
CREATE INDEX idx_mailroom_location_city ON mailroom_location_table(mailroom_location_city);
CREATE INDEX idx_mailroom_location_region ON mailroom_location_table(mailroom_location_region);

-- Lockers
CREATE INDEX idx_location_locker_location_id ON location_locker_table(mailroom_location_id);
CREATE INDEX idx_location_locker_is_available ON location_locker_table(location_locker_is_available);

-- Mailroom Registrations
CREATE INDEX idx_mailroom_registration_user_id ON mailroom_registration_table(user_id);
CREATE INDEX idx_mailroom_registration_location_id ON mailroom_registration_table(mailroom_location_id);
CREATE INDEX idx_mailroom_registration_plan_id ON mailroom_registration_table(mailroom_plan_id);
CREATE INDEX idx_mailroom_registration_created_at ON mailroom_registration_table(mailroom_registration_created_at);
CREATE INDEX idx_mailroom_registration_status ON mailroom_registration_table(mailroom_registration_status);
CREATE INDEX idx_mailroom_registration_code ON mailroom_registration_table(mailroom_registration_code);

-- Subscriptions
CREATE INDEX idx_subscription_registration_id ON subscription_table(mailroom_registration_id);
CREATE INDEX idx_subscription_expires_at ON subscription_table(subscription_expires_at);
CREATE INDEX idx_subscription_billing_cycle ON subscription_table(subscription_billing_cycle);

-- Payment Transactions
CREATE INDEX idx_payment_transaction_registration_id ON payment_transaction_table(mailroom_registration_id);
CREATE INDEX idx_payment_transaction_status ON payment_transaction_table(payment_transaction_status);
CREATE INDEX idx_payment_transaction_date ON payment_transaction_table(payment_transaction_date);
CREATE INDEX idx_payment_transaction_order_id ON payment_transaction_table(payment_transaction_order_id);

-- Mailbox Items
CREATE INDEX idx_mailbox_item_registration_id ON mailbox_item_table(mailroom_registration_id);
CREATE INDEX idx_mailbox_item_status ON mailbox_item_table(mailbox_item_status);
CREATE INDEX idx_mailbox_item_type ON mailbox_item_table(mailbox_item_type);
CREATE INDEX idx_mailbox_item_location_locker_id ON mailbox_item_table(location_locker_id);
CREATE INDEX idx_mailbox_item_received_at ON mailbox_item_table(mailbox_item_received_at);

-- Mail Action Requests
CREATE INDEX idx_mail_action_request_item_id ON mail_action_request_table(mailbox_item_id);
CREATE INDEX idx_mail_action_request_user_id ON mail_action_request_table(user_id);
CREATE INDEX idx_mail_action_request_status ON mail_action_request_table(mail_action_request_status);
CREATE INDEX idx_mail_action_request_type ON mail_action_request_table(mail_action_request_type);
CREATE INDEX idx_mail_action_request_created_at ON mail_action_request_table(mail_action_request_created_at);

-- Mailroom Files
CREATE INDEX idx_mailroom_file_item_id ON mailroom_file_table(mailbox_item_id);
CREATE INDEX idx_mailroom_file_type ON mailroom_file_table(mailroom_file_type);
CREATE INDEX idx_mailroom_file_uploaded_at ON mailroom_file_table(mailroom_file_uploaded_at);

-- Notifications
CREATE INDEX idx_notification_user_id ON notification_table(user_id);
CREATE INDEX idx_notification_is_read ON notification_table(notification_is_read);
CREATE INDEX idx_notification_created_at ON notification_table(notification_created_at);

-- Referrals
CREATE INDEX idx_referral_referrer_user_id ON referral_table(referral_referrer_user_id);
CREATE INDEX idx_referral_referred_user_id ON referral_table(referral_referred_user_id);
CREATE INDEX idx_referral_service_type ON referral_table(referral_service_type);

-- Activity Log
CREATE INDEX idx_activity_log_user_id ON activity_log_table(user_id);
CREATE INDEX idx_activity_log_type ON activity_log_table(activity_type);
CREATE INDEX idx_activity_log_entity ON activity_log_table(activity_entity_type, activity_entity_id);
CREATE INDEX idx_activity_log_created_at ON activity_log_table(activity_created_at);

-- Error Log
CREATE INDEX idx_error_log_user_id ON error_log_table(user_id);
CREATE INDEX idx_error_log_type ON error_log_table(error_type);
CREATE INDEX idx_error_log_resolved ON error_log_table(error_resolved);
CREATE INDEX idx_error_log_created_at ON error_log_table(error_created_at);
CREATE INDEX idx_error_log_request_path ON error_log_table(request_path);
CREATE INDEX idx_error_log_error_code ON error_log_table(error_code);

-- Rewards Claims
CREATE INDEX idx_rewards_claim_user_id ON rewards_claim_table(user_id);
CREATE INDEX idx_rewards_claim_status ON rewards_claim_table(rewards_claim_status);
CREATE INDEX idx_rewards_claim_created_at ON rewards_claim_table(rewards_claim_created_at);

-- RPCs for managing entries in user_address_table
CREATE OR REPLACE FUNCTION public.user_list_addresses(input_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  result JSON := '[]'::JSON;
BEGIN
  IF input_user_id IS NULL THEN
    RETURN result;
  END IF;

  SELECT COALESCE(
    JSON_AGG(
      JSON_BUILD_OBJECT(
        'user_address_id', user_address_id,
        'user_id', user_id,
        'user_address_label', user_address_label,
        'user_address_line1', user_address_line1,
        'user_address_line2', user_address_line2,
        'user_address_city', user_address_city,
        'user_address_region', user_address_region,
        'user_address_postal', user_address_postal,
        'user_address_is_default', user_address_is_default,
        'user_address_created_at', user_address_created_at
      )
      ORDER BY user_address_is_default DESC,
               user_address_created_at DESC
    ),
    '[]'::JSON
  )
  INTO result
  FROM public.user_address_table
  WHERE user_id = input_user_id;

  RETURN result;
END;
$$;


CREATE OR REPLACE FUNCTION public.user_create_address(
  input_user_id UUID,
  input_line1 TEXT,
  input_label TEXT DEFAULT NULL,
  input_line2 TEXT DEFAULT NULL,
  input_city TEXT DEFAULT NULL,
  input_region TEXT DEFAULT NULL,
  input_postal TEXT DEFAULT NULL,
  input_is_default BOOLEAN DEFAULT FALSE
)
RETURNS public.user_address_table
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  new_row public.user_address_table%ROWTYPE;
BEGIN
  IF input_user_id IS NULL OR input_line1 IS NULL THEN
    RAISE EXCEPTION 'user id and line1 are required';
  END IF;

  IF COALESCE(input_is_default, FALSE) THEN
    UPDATE public.user_address_table
    SET user_address_is_default = FALSE
    WHERE user_id = input_user_id;
  END IF;

  INSERT INTO public.user_address_table (
    user_id,
    user_address_label,
    user_address_line1,
    user_address_line2,
    user_address_city,
    user_address_region,
    user_address_postal,
    user_address_is_default
  )
  VALUES (
    input_user_id,
    NULLIF(TRIM(input_label), ''),
    input_line1,
    NULLIF(TRIM(input_line2), ''),
    NULLIF(TRIM(input_city), ''),
    NULLIF(TRIM(input_region), ''),
    NULLIF(TRIM(input_postal), ''),
    COALESCE(input_is_default, FALSE)
  )
  RETURNING * INTO new_row;

  RETURN new_row;
END;
$$;


CREATE OR REPLACE FUNCTION public.user_update_address(
  input_user_address_id UUID,
  input_line1 TEXT,
  input_label TEXT DEFAULT NULL,
  input_line2 TEXT DEFAULT NULL,
  input_city TEXT DEFAULT NULL,
  input_region TEXT DEFAULT NULL,
  input_postal TEXT DEFAULT NULL,
  input_is_default BOOLEAN DEFAULT FALSE
)
RETURNS public.user_address_table
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  target_row public.user_address_table%ROWTYPE;
  updated_row public.user_address_table%ROWTYPE;
BEGIN
  IF input_user_address_id IS NULL OR input_line1 IS NULL THEN
    RAISE EXCEPTION 'address id and line1 are required';
  END IF;

  SELECT *
  INTO target_row
  FROM public.user_address_table
  WHERE user_address_id = input_user_address_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Address not found';
  END IF;

  IF COALESCE(input_is_default, FALSE) THEN
    UPDATE public.user_address_table
    SET user_address_is_default = FALSE
    WHERE user_id = target_row.user_id;
  END IF;

  UPDATE public.user_address_table
  SET
    user_address_label = NULLIF(TRIM(input_label), ''),
    user_address_line1 = input_line1,
    user_address_line2 = NULLIF(TRIM(input_line2), ''),
    user_address_city = NULLIF(TRIM(input_city), ''),
    user_address_region = NULLIF(TRIM(input_region), ''),
    user_address_postal = NULLIF(TRIM(input_postal), ''),
    user_address_is_default = COALESCE(input_is_default, FALSE)
  WHERE user_address_id = input_user_address_id
  RETURNING * INTO updated_row;

  RETURN updated_row;
END;
$$;


CREATE OR REPLACE FUNCTION public.user_delete_address(
  input_user_address_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  IF input_user_address_id IS NULL THEN
    RETURN FALSE;
  END IF;

  DELETE FROM public.user_address_table
  WHERE user_address_id = input_user_address_id;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count > 0;
END;
$$;


-- RPC to aggregate admin dashboard statistics in a single call
CREATE OR REPLACE FUNCTION public.admin_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  result JSON;
BEGIN
  WITH pkg_counts AS (
  SELECT
    COUNT(*) FILTER (
      WHERE mailbox_item_status IN ('REQUEST_TO_SCAN', 'REQUEST_TO_RELEASE', 'REQUEST_TO_DISPOSE')
    ) AS pending_count,
    COUNT(*) FILTER (
      WHERE mailbox_item_status IN ('STORED', 'REQUEST_TO_SCAN', 'REQUEST_TO_RELEASE', 'REQUEST_TO_DISPOSE')
    ) AS stored_count
  FROM public.mailbox_item_table
),
sub_counts AS (
  SELECT COUNT(*) AS total_subscribers FROM public.mailroom_registration_table
),
locker_totals AS (
  SELECT COUNT(*) AS total_lockers FROM public.location_locker_table
),
assigned_locker_totals AS (
  SELECT COUNT(*) AS assigned_lockers FROM public.mailroom_assigned_locker_table
),
recent AS (
  SELECT
    mi.mailbox_item_id,
    mi.mailbox_item_name,
    mi.mailbox_item_type,
    mi.mailbox_item_status,
    mi.mailbox_item_received_at,
    COALESCE(
      CONCAT_WS(' ', uk.user_kyc_first_name, uk.user_kyc_last_name),
      ml.mailroom_location_name,
      CONCAT('Mailroom #', SUBSTRING(mr.mailroom_registration_id::TEXT FROM 1 FOR 8))
    ) AS full_name
  FROM public.mailbox_item_table mi
  LEFT JOIN public.mailroom_registration_table mr
    ON mr.mailroom_registration_id = mi.mailroom_registration_id
  LEFT JOIN public.mailroom_location_table ml
    ON ml.mailroom_location_id = mr.mailroom_location_id
  LEFT JOIN public.users_table u
    ON u.users_id = mr.user_id
  LEFT JOIN public.user_kyc_table uk
    ON uk.user_id = u.users_id
  ORDER BY mi.mailbox_item_received_at DESC NULLS LAST
  LIMIT 5
),
recent_payload AS (
  SELECT COALESCE(
    JSON_AGG(
      JSON_BUILD_OBJECT(
        'id', r.mailbox_item_id,
        'package_name', r.mailbox_item_name,
        'package_type', r.mailbox_item_type,
        'status', r.mailbox_item_status,
        'received_at', r.mailbox_item_received_at,
        'registration', CASE
          WHEN r.full_name IS NULL THEN NULL
          ELSE JSON_BUILD_OBJECT('full_name', r.full_name)
        END
      )
      ORDER BY r.mailbox_item_received_at DESC NULLS LAST
    ),
    '[]'::JSON
  ) AS recent_packages
  FROM recent r
)
  SELECT JSON_BUILD_OBJECT(
    'pendingRequests', pkg_counts.pending_count,
    'storedPackages', pkg_counts.stored_count,
    'totalSubscribers', sub_counts.total_subscribers,
    'lockerStats', JSON_BUILD_OBJECT(
      'total', locker_totals.total_lockers,
      'assigned', assigned_locker_totals.assigned_lockers
    ),
    'recentPackages', recent_payload.recent_packages
  )
  INTO result
  FROM pkg_counts
  CROSS JOIN sub_counts
  CROSS JOIN locker_totals
  CROSS JOIN assigned_locker_totals
  CROSS JOIN recent_payload;

  RETURN result;
END;
$$;


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


-- Enable row-level security
alter table public.users_table enable row level security;

-- Policy: Users can select only their own data
create policy "Users can select their own data"
on public.users_table
for select
using (auth.uid() = users_id);

-- Policy: Users can update only their own data
create policy "Users can update their own data"
on public.users_table
for update
using (auth.uid() = users_id);

-- Policy: Admins can select and update all data
create policy "Admins can manage all users"
on public.users_table
for all
using (exists (
  select 1 
  from public.users_table as u
  where u.users_id = auth.uid() and u.users_role = 'admin'
));

-- Policy: Allow insert for everyone (sign up)
create policy "Allow insert for everyone"
on public.users_table
for insert
with check (true);

-- Only allow users to access objects in their own bucket by auth.uid()
CREATE POLICY mailroom_proofs_policy
ON storage.objects
FOR ALL
USING (bucket_id = 'mailroom_proofs' AND owner = auth.uid());

CREATE POLICY mailroom_scans_policy
ON storage.objects
FOR ALL
USING (bucket_id = 'mailroom_scans' AND owner = auth.uid());

CREATE POLICY reward_proofs_policy
ON storage.objects
FOR ALL
USING (bucket_id = 'reward_proofs' AND owner = auth.uid());

CREATE POLICY avatars_policy
ON storage.objects
FOR ALL
USING (bucket_id = 'avatars' AND owner = auth.uid());

-- Policy for USER-KYC-DOCUMENTS storage bucket: allow users to upload/access files in their own folder
-- Files are stored as: {user_id}/front-{timestamp}-{filename}
CREATE POLICY user_kyc_policy
ON storage.objects
FOR ALL
USING (
  bucket_id = 'USER-KYC-DOCUMENTS' 
  AND (
    owner = auth.uid() 
    OR split_part(name, '/', 1) = auth.uid()::text
  )
);


-- Rewards status RPC consolidates referral count + claims metadata
CREATE OR REPLACE FUNCTION get_rewards_status(input_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  threshold CONSTANT INTEGER := 10;
  default_amount CONSTANT NUMERIC := 500;
  referral_cnt INTEGER := 0;
  claims JSON := '[]'::JSON;
  has_processing_or_paid BOOLEAN := FALSE;
BEGIN
  IF input_user_id IS NULL THEN
    RAISE EXCEPTION 'input_user_id is required';
  END IF;

  SELECT COUNT(*)
  INTO referral_cnt
  FROM public.referral_table
  WHERE referral_referrer_user_id = input_user_id;

  SELECT COALESCE(
    JSON_AGG(
      JSON_BUILD_OBJECT(
        'id', rewards_claim_id,
        'user_id', user_id,
        'payment_method', rewards_claim_payment_method,
        'account_details', rewards_claim_account_details,
        'amount', rewards_claim_amount,
        'status', rewards_claim_status,
        'referral_count', rewards_claim_referral_count,
        'created_at', rewards_claim_created_at,
        'processed_at', rewards_claim_processed_at,
        'proof_path', rewards_claim_proof_path
      )
      ORDER BY rewards_claim_created_at DESC
    ),
    '[]'::JSON
  )
  INTO claims
  FROM public.rewards_claim_table
  WHERE user_id = input_user_id;

  SELECT EXISTS (
    SELECT 1
    FROM public.rewards_claim_table
    WHERE user_id = input_user_id
      AND rewards_claim_status IN ('PROCESSING', 'PAID')
  )
  INTO has_processing_or_paid;

  RETURN JSON_BUILD_OBJECT(
    'threshold', threshold,
    'amount', default_amount,
    'referralCount', referral_cnt,
    'eligible', referral_cnt >= threshold,
    'hasClaim', has_processing_or_paid,
    'claims', claims
  );
END;
$$;

-- RPC: handle reward claim creation with eligibility checks
CREATE OR REPLACE FUNCTION request_reward_claim(
  input_user_id UUID,
  input_payment_method TEXT,
  input_account_details TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  threshold CONSTANT INTEGER := 10;
  default_amount CONSTANT NUMERIC := 500;
  referral_cnt INTEGER := 0;
  existing_claim_id UUID;
  inserted_claim public.rewards_claim_table%ROWTYPE;
BEGIN
  IF input_user_id IS NULL
     OR input_payment_method IS NULL
     OR input_account_details IS NULL
  THEN
    RETURN JSON_BUILD_OBJECT(
      'ok', FALSE,
      'error', 'Missing fields',
      'status', 400
    );
  END IF;

  SELECT COUNT(*)
  INTO referral_cnt
  FROM public.referral_table
  WHERE referral_referrer_user_id = input_user_id;

  IF referral_cnt < threshold THEN
    RETURN JSON_BUILD_OBJECT(
      'ok', FALSE,
      'error', 'Not enough referrals',
      'status', 403
    );
  END IF;

  SELECT rewards_claim_id
  INTO existing_claim_id
  FROM public.rewards_claim_table
  WHERE user_id = input_user_id
    AND rewards_claim_status IN ('PENDING', 'PROCESSING', 'PAID')
  LIMIT 1;

  IF existing_claim_id IS NOT NULL THEN
    RETURN JSON_BUILD_OBJECT(
      'ok', FALSE,
      'error', 'Reward already claimed or pending',
      'status', 409
    );
  END IF;

  INSERT INTO public.rewards_claim_table (
    user_id,
    rewards_claim_payment_method,
    rewards_claim_account_details,
    rewards_claim_amount,
    rewards_claim_status,
    rewards_claim_referral_count
  )
  VALUES (
    input_user_id,
    UPPER(input_payment_method),
    input_account_details,
    default_amount,
    'PENDING',
    referral_cnt
  )
  RETURNING * INTO inserted_claim;

  RETURN JSON_BUILD_OBJECT(
    'ok', TRUE,
    'claim', ROW_TO_JSON(inserted_claim)
  );
END;
$$;

-- RPC: list reward claims for admins
CREATE OR REPLACE FUNCTION admin_list_reward_claims()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  result JSON := '[]'::JSON;
BEGIN
  SELECT COALESCE(
    JSON_AGG(
      JSON_BUILD_OBJECT(
        'id', r.rewards_claim_id,
        'user_id', r.user_id,
        'payment_method', r.rewards_claim_payment_method,
        'account_details', r.rewards_claim_account_details,
        'amount', r.rewards_claim_amount,
        'status', r.rewards_claim_status,
        'referral_count', r.rewards_claim_referral_count,
        'created_at', r.rewards_claim_created_at,
        'processed_at', r.rewards_claim_processed_at,
        'proof_path', r.rewards_claim_proof_path,
        'user', CASE
          WHEN u.users_id IS NOT NULL THEN JSON_BUILD_OBJECT(
            'id', u.users_id,
            'email', u.users_email,
            'referral_code', u.users_referral_code
          )
          ELSE NULL
        END
      )
      ORDER BY r.rewards_claim_created_at DESC
    ),
    '[]'::JSON
  )
  INTO result
  FROM public.rewards_claim_table r
  LEFT JOIN public.users_table u ON u.users_id = r.user_id;

  RETURN result;
END;
$$;

-- RPC: update reward claim status for admins
CREATE OR REPLACE FUNCTION admin_update_reward_claim(
  input_claim_id UUID,
  input_status TEXT,
  input_proof_path TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  allowed_status CONSTANT TEXT[] := ARRAY['PROCESSING', 'PAID'];
  updated_row public.rewards_claim_table%ROWTYPE;
BEGIN
  IF input_claim_id IS NULL OR input_status IS NULL THEN
    RAISE EXCEPTION 'claim id and status are required';
  END IF;

  IF NOT input_status = ANY(allowed_status) THEN
    RAISE EXCEPTION 'Invalid status %', input_status;
  END IF;

  UPDATE public.rewards_claim_table
  SET
    rewards_claim_status = input_status::public.rewards_claim_status,
    rewards_claim_processed_at = CASE
      WHEN input_status = 'PAID' THEN NOW()
      ELSE rewards_claim_processed_at
    END,
    rewards_claim_proof_path = COALESCE(input_proof_path, rewards_claim_proof_path)
  WHERE rewards_claim_id = input_claim_id
  RETURNING * INTO updated_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Claim not found';
  END IF;

  RETURN JSON_BUILD_OBJECT(
    'ok', TRUE,
    'claim', JSON_BUILD_OBJECT(
      'id', updated_row.rewards_claim_id,
      'user_id', updated_row.user_id,
      'payment_method', updated_row.rewards_claim_payment_method,
      'account_details', updated_row.rewards_claim_account_details,
      'amount', updated_row.rewards_claim_amount,
      'status', updated_row.rewards_claim_status,
      'referral_count', updated_row.rewards_claim_referral_count,
      'created_at', updated_row.rewards_claim_created_at,
      'processed_at', updated_row.rewards_claim_processed_at,
      'proof_path', updated_row.rewards_claim_proof_path
    )
  );
END;
$$;

-- Rewards status RPC consolidates referral count + claims metadata
CREATE OR REPLACE FUNCTION public.get_user_kyc_by_user_id(input_user_id UUID)
RETURNS public.user_kyc_table
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  result public.user_kyc_table%ROWTYPE;
BEGIN
  IF input_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT *
  INTO result
  FROM public.user_kyc_table
  WHERE user_id = input_user_id
  LIMIT 1;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.user_is_verified(input_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  status_text TEXT;
BEGIN
  IF input_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT user_kyc_status
  INTO status_text
  FROM public.user_kyc_table
  WHERE user_id = input_user_id
  LIMIT 1;

  RETURN status_text;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_user_kyc(
  input_search TEXT DEFAULT '',
  input_limit INTEGER DEFAULT 500
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  sanitized_limit INTEGER := LEAST(GREATEST(COALESCE(input_limit, 1), 1), 1000);
  search_term TEXT := COALESCE(input_search, '');
  result JSON := '[]'::JSON;
BEGIN
  WITH base AS (
    SELECT
      uk.user_kyc_id,
      uk.user_id,
      uk.user_kyc_status,
      uk.user_kyc_id_document_type,
      uk.user_kyc_id_front_url,
      uk.user_kyc_id_back_url,
      uk.user_kyc_first_name,
      uk.user_kyc_last_name,
      uk.user_kyc_submitted_at,
      uk.user_kyc_verified_at,
      uk.user_kyc_created_at,
      uk.user_kyc_updated_at,
      addr.user_kyc_address_line_one AS addr_line1,
      addr.user_kyc_address_line_two AS addr_line2,
      addr.user_kyc_address_city AS addr_city,
      addr.user_kyc_address_region AS addr_region,
      addr.user_kyc_address_postal_code AS addr_postal

    FROM public.user_kyc_table uk
    LEFT JOIN LATERAL (
      SELECT *
      FROM public.user_kyc_address_table a
      WHERE a.user_kyc_id = uk.user_kyc_id
      ORDER BY a.user_kyc_address_created_at DESC
      LIMIT 1
    ) addr ON TRUE
    WHERE
      search_term = ''
      OR uk.user_kyc_first_name ILIKE '%' || search_term || '%'
      OR uk.user_kyc_last_name ILIKE '%' || search_term || '%'
    ORDER BY uk.user_kyc_submitted_at DESC NULLS LAST
    LIMIT sanitized_limit
  )
  SELECT COALESCE(
    JSON_AGG(
      JSON_BUILD_OBJECT(
        'user_kyc_id', user_kyc_id,
        'user_id', user_id,
        'user_kyc_status', user_kyc_status,
        'user_kyc_id_document_type', user_kyc_id_document_type,
        'user_kyc_id_front_url', user_kyc_id_front_url,
        'user_kyc_id_back_url', user_kyc_id_back_url,
        'user_kyc_first_name', user_kyc_first_name,
        'user_kyc_last_name', user_kyc_last_name,
        'user_kyc_submitted_at', user_kyc_submitted_at,
        'user_kyc_verified_at', user_kyc_verified_at,
        'user_kyc_created_at', user_kyc_created_at,
        'user_kyc_updated_at', user_kyc_updated_at,
        'address', CASE
          WHEN addr_line1 IS NULL
            AND addr_line2 IS NULL
            AND addr_city IS NULL
            AND addr_region IS NULL
            AND addr_postal IS NULL
          THEN NULL
          ELSE JSON_BUILD_OBJECT(
            'line1', addr_line1,
            'line2', addr_line2,
            'city', addr_city,
            'region', addr_region,
            'postal', addr_postal
          )
        END
      )
    ),
    '[]'::JSON
  )
  INTO result
  FROM base;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_user_kyc(
  input_user_id UUID,
  input_status TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  normalized_status TEXT;
  updated_row public.user_kyc_table%ROWTYPE;
BEGIN
  IF input_user_id IS NULL THEN
    RAISE EXCEPTION 'input_user_id is required';
  END IF;

  normalized_status := UPPER(COALESCE(input_status, ''));

  IF normalized_status NOT IN ('VERIFIED', 'REJECTED') THEN
    RAISE EXCEPTION 'Invalid status %', normalized_status;
  END IF;

  UPDATE public.user_kyc_table
  SET
    user_kyc_status = normalized_status::public.user_kyc_status,
    user_kyc_updated_at = NOW(),
    user_kyc_verified_at = CASE
      WHEN normalized_status = 'VERIFIED' THEN NOW()
      ELSE user_kyc_verified_at
    END
  WHERE user_id = input_user_id
  RETURNING * INTO updated_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User KYC not found';
  END IF;

  RETURN JSON_BUILD_OBJECT(
    'ok', TRUE,
    'data', ROW_TO_JSON(updated_row)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(input_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  role_text TEXT;
BEGIN
  IF input_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT users_role
  INTO role_text
  FROM public.users_table
  WHERE users_id = input_user_id
  LIMIT 1;

  RETURN role_text;
END;
$$;

-- RPC: get user mailroom registrations with related data
CREATE OR REPLACE FUNCTION get_user_mailroom_registrations(input_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  result JSON := '[]'::JSON;
BEGIN
  IF input_user_id IS NULL THEN
    RETURN '[]'::JSON;
  END IF;

  SELECT COALESCE(
    JSON_AGG(
      JSON_BUILD_OBJECT(
        'mailroom_registration_id', r.mailroom_registration_id,
        'user_id', r.user_id,
        'mailroom_location_id', r.mailroom_location_id,
        'mailroom_plan_id', r.mailroom_plan_id,
        'mailroom_registration_code', r.mailroom_registration_code,
        'mailroom_registration_status', r.mailroom_registration_status,
        'mailroom_registration_created_at', r.mailroom_registration_created_at,
        'mailroom_registration_updated_at', r.mailroom_registration_updated_at,
        'mailroom_location_table', CASE
          WHEN l.mailroom_location_id IS NOT NULL THEN JSON_BUILD_OBJECT(
            'mailroom_location_id', l.mailroom_location_id,
            'mailroom_location_name', l.mailroom_location_name,
            'mailroom_location_city', l.mailroom_location_city,
            'mailroom_location_region', l.mailroom_location_region,
            'mailroom_location_barangay', l.mailroom_location_barangay,
            'mailroom_location_zip', l.mailroom_location_zip
          )
          ELSE NULL
        END,
        'mailroom_plan_table', CASE
          WHEN p.mailroom_plan_id IS NOT NULL THEN JSON_BUILD_OBJECT(
            'mailroom_plan_id', p.mailroom_plan_id,
            'mailroom_plan_name', p.mailroom_plan_name,
            'mailroom_plan_price', p.mailroom_plan_price
          )
          ELSE NULL
        END,
        'subscription_table', CASE
          WHEN s.subscription_id IS NOT NULL THEN JSON_BUILD_OBJECT(
            'subscription_id', s.subscription_id,
            'subscription_expires_at', s.subscription_expires_at,
            'subscription_auto_renew', s.subscription_auto_renew,
            'subscription_started_at', s.subscription_started_at
          )
          ELSE NULL
        END,
        'users_table', CASE
          WHEN u.users_id IS NOT NULL THEN JSON_BUILD_OBJECT(
            'users_id', u.users_id,
            'users_email', u.users_email,
            'users_avatar_url', u.users_avatar_url,
            'mobile_number', u.mobile_number,
            'user_kyc_table', CASE
              WHEN k.user_kyc_id IS NOT NULL THEN JSON_BUILD_OBJECT(
                'user_kyc_first_name', k.user_kyc_first_name,
                'user_kyc_last_name', k.user_kyc_last_name,
                'user_kyc_status', k.user_kyc_status
              )
              ELSE NULL
            END
          )
          ELSE NULL
        END
      )
      ORDER BY r.mailroom_registration_created_at DESC
    ),
    '[]'::JSON
  )
  INTO result
  FROM public.mailroom_registration_table r
  LEFT JOIN public.mailroom_location_table l ON l.mailroom_location_id = r.mailroom_location_id
  LEFT JOIN public.mailroom_plan_table p ON p.mailroom_plan_id = r.mailroom_plan_id
  LEFT JOIN public.subscription_table s ON s.mailroom_registration_id = r.mailroom_registration_id
  LEFT JOIN public.users_table u ON u.users_id = r.user_id
  LEFT JOIN public.user_kyc_table k ON k.user_id = u.users_id
  WHERE r.user_id = input_user_id;

  RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_mailroom_registrations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_mailroom_registrations(UUID) TO anon;

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

-- Add unique constraint to payment_transaction_order_id to prevent duplicate registrations
ALTER TABLE public.payment_transaction_table 
ADD CONSTRAINT payment_transaction_table_order_id_unique UNIQUE (payment_transaction_order_id);




