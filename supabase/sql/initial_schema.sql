-- Remove all policies for files
DROP POLICY IF EXISTS objects_policy ON storage.objects;
DROP POLICY IF EXISTS buckets_policy ON storage.buckets;

-- Delete file buckets created and files uploaded
DELETE FROM storage.objects;
DELETE FROM storage.buckets;

-- Start storage
INSERT INTO storage.buckets (id, name, public) VALUES
('USER-KYC-DOCUMENTS', 'USER-KYC-DOCUMENTS', true)
ON CONFLICT (id) DO NOTHING;

-- Create additional storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('PACKAGES-PHOTO', 'PACKAGES-PHOTO', true),
  ('MAILROOM-SCANS', 'MAILROOM-SCANS', true),
  ('MAILROOM-PROOFS', 'MAILROOM-PROOFS', true),
  ('REWARD-PROOFS', 'REWARD-PROOFS', true),
  ('AVATARS', 'AVATARS', true)
ON CONFLICT (id) DO NOTHING;

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
  referral_reward_milestone_claimed INT DEFAULT 0,
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
  location_locker_deleted_at TIMESTAMP WITH TIME ZONE,
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
  mailbox_item_deleted_at TIMESTAMP WITH TIME ZONE,
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
  rewards_claim_total_referrals INT,
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
CREATE INDEX idx_mailbox_item_deleted_at ON mailbox_item_table(mailbox_item_deleted_at);

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
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_referrals INT;
    v_claimed_milestones INT;
    v_eligible_milestones INT;
    v_claimable_count INT;
    v_referral_code TEXT;
BEGIN
    SELECT users_referral_code, referral_reward_milestone_claimed 
    INTO v_referral_code, v_claimed_milestones
    FROM users_table 
    WHERE users_id = input_user_id;

    SELECT COUNT(*) INTO v_total_referrals
    FROM public.referral_table
    WHERE referral_referrer_user_id = input_user_id;

    v_eligible_milestones := FLOOR(v_total_referrals / 10);
    v_claimable_count := v_eligible_milestones - v_claimed_milestones;

    RETURN jsonb_build_object(
        'threshold', 10,
        'amount_per_milestone', 500,
        'referralCount', v_total_referrals,
        'eligibleMilestones', v_eligible_milestones,
        'claimedMilestones', v_claimed_milestones,
        'claimableCount', v_claimable_count,
        'eligible', v_claimable_count > 0
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

-- ============================================================================
-- ADDITIONAL RPC FUNCTIONS FROM MIGRATIONS
-- ============================================================================

-- Dashboard Stats RPC
CREATE OR REPLACE FUNCTION public.get_user_mailroom_stats(input_user_id UUID)
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'stored', COALESCE(SUM(CASE WHEN UPPER(m.mailbox_item_status::text) NOT IN ('RELEASED','RETRIEVED','DISPOSED') THEN 1 ELSE 0 END), 0),
    'pending', COALESCE(SUM(CASE WHEN UPPER(m.mailbox_item_status::text) LIKE 'REQUEST%' THEN 1 ELSE 0 END), 0),
    'released', COALESCE(SUM(CASE WHEN UPPER(m.mailbox_item_status::text) = 'RELEASED' THEN 1 ELSE 0 END), 0)
  )
  FROM public.mailbox_item_table m
  JOIN public.mailroom_registration_table r ON r.mailroom_registration_id = m.mailroom_registration_id
  WHERE r.user_id = input_user_id;
$$;

-- Registration Stats RPC
CREATE OR REPLACE FUNCTION public.get_user_mailroom_registration_stats(input_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  IF input_user_id IS NULL THEN
    RETURN '[]'::JSON;
  END IF;

  SELECT COALESCE(
    JSON_AGG(
      JSON_BUILD_OBJECT(
        'mailroom_registration_id', r.mailroom_registration_id,
        'stored', COALESCE(SUM(CASE WHEN UPPER(m.mailbox_item_status::text) NOT IN ('RELEASED','RETRIEVED','DISPOSED') THEN 1 ELSE 0 END), 0),
        'pending', COALESCE(SUM(CASE WHEN UPPER(m.mailbox_item_status::text) LIKE 'REQUEST%' THEN 1 ELSE 0 END), 0),
        'released', COALESCE(SUM(CASE WHEN UPPER(m.mailbox_item_status::text) = 'RELEASED' THEN 1 ELSE 0 END), 0)
      )
    ),
    '[]'::JSON
  )
  INTO result
  FROM public.mailroom_registration_table r
  LEFT JOIN public.mailbox_item_table m ON m.mailroom_registration_id = r.mailroom_registration_id
  WHERE r.user_id = input_user_id
  GROUP BY r.mailroom_registration_id;

  RETURN COALESCE(result, '[]'::JSON);
END;
$$;

-- Customer Mailroom Registration RPCs (from 20251229000013)
CREATE OR REPLACE FUNCTION public.get_user_mailroom_registration(input_data JSON)
RETURNS JSON
SET search_path TO ''
SECURITY DEFINER
AS $$
DECLARE
  input_user_id UUID := (input_data->>'input_user_id')::UUID;
  input_registration_id UUID := (input_data->>'input_registration_id')::UUID;
  return_data JSON;
BEGIN
  SELECT row_to_json(t) INTO return_data
  FROM (
    SELECT
      mrt.mailroom_registration_id,
      mrt.user_id,
      mrt.mailroom_location_id,
      mrt.mailroom_plan_id,
      mrt.mailroom_registration_code,
      mrt.mailroom_registration_status,
      mrt.mailroom_registration_created_at,
      mrt.mailroom_registration_updated_at,
      row_to_json(mpt) as mailroom_plan_table,
      row_to_json(mlt) as mailroom_location_table,
      json_build_object(
        'users_id', ut.users_id,
        'users_email', ut.users_email,
        'users_phone', ut.mobile_number,
        'users_referral_code', ut.users_referral_code,
        'user_kyc_table', row_to_json(ukt)
      ) as users_table,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'mailbox_item_id', mit_inner.mailbox_item_id,
              'mailbox_item_name', mit_inner.mailbox_item_name,
              'mailbox_item_status', mit_inner.mailbox_item_status,
              'mailbox_item_type', mit_inner.mailbox_item_type,
              'mailbox_item_photo', mit_inner.mailbox_item_photo,
              'mailbox_item_received_at', mit_inner.mailbox_item_received_at,
              'mailroom_file_table', (
                SELECT json_agg(row_to_json(mft))
                FROM public.mailroom_file_table mft
                WHERE mft.mailbox_item_id = mit_inner.mailbox_item_id
              )
            )
          )
          FROM public.mailbox_item_table mit_inner
          WHERE mit_inner.mailroom_registration_id = mrt.mailroom_registration_id
          AND mit_inner.mailbox_item_deleted_at IS NULL
        ),
        '[]'::json
      ) as mailbox_item_table,
      row_to_json(st) as subscription_table
    FROM public.mailroom_registration_table mrt
    LEFT JOIN public.mailroom_plan_table mpt ON mrt.mailroom_plan_id = mpt.mailroom_plan_id
    LEFT JOIN public.mailroom_location_table mlt ON mrt.mailroom_location_id = mlt.mailroom_location_id
    LEFT JOIN public.users_table ut ON mrt.user_id = ut.users_id
    LEFT JOIN public.user_kyc_table ukt ON ut.users_id = ukt.user_id
    LEFT JOIN public.subscription_table st ON mrt.mailroom_registration_id = st.mailroom_registration_id
    WHERE mrt.mailroom_registration_id = input_registration_id
      AND mrt.user_id = input_user_id
    GROUP BY 
      mrt.mailroom_registration_id, 
      mpt.mailroom_plan_id, 
      mlt.mailroom_location_id, 
      ut.users_id, 
      ukt.user_kyc_id, 
      st.subscription_id
  ) t;
  RETURN return_data;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_user_assigned_lockers(input_data JSON)
RETURNS JSON
SET search_path TO ''
SECURITY DEFINER
AS $$
DECLARE
  input_registration_id UUID := (input_data->>'input_registration_id')::UUID;
  return_data JSON;
BEGIN
  SELECT json_agg(row_to_json(t)) INTO return_data
  FROM (
    SELECT
      malt.*,
      row_to_json(llt) as location_locker_table
    FROM public.mailroom_assigned_locker_table malt
    LEFT JOIN public.location_locker_table llt ON malt.location_locker_id = llt.location_locker_id
    WHERE malt.mailroom_registration_id = input_registration_id
  ) t;
  RETURN return_data;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_user_mailbox_items_by_registrations(input_data JSON)
RETURNS JSON
SET search_path TO ''
SECURITY DEFINER
AS $$
DECLARE
  input_registration_ids UUID[] := (
    SELECT array_agg(value::text::uuid)
    FROM json_array_elements_text(input_data->'input_registration_ids') AS value
  );
  return_data JSON;
BEGIN
  SELECT json_agg(row_to_json(t)) INTO return_data
  FROM (
    SELECT
      mit.mailroom_registration_id,
      mit.mailbox_item_status
    FROM public.mailbox_item_table mit
    WHERE mit.mailroom_registration_id = ANY(input_registration_ids)
  ) t;
  RETURN return_data;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.cancel_user_mailroom_subscription(input_registration_id UUID)
RETURNS BOOLEAN
SET search_path TO ''
SECURITY DEFINER
AS $$
DECLARE
  return_data BOOLEAN;
BEGIN
  UPDATE public.subscription_table
  SET subscription_auto_renew = FALSE
  WHERE mailroom_registration_id = input_registration_id;

  IF FOUND THEN
    return_data := TRUE;
  ELSE
    return_data := FALSE;
  END IF;

  RETURN return_data;
END;
$$ LANGUAGE plpgsql;

-- Mailroom Registration RPCs (from 20251229000014)
CREATE OR REPLACE FUNCTION check_locker_availability(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
    input_location_id UUID := (input_data->>'location_id')::UUID;
    input_locker_qty INTEGER := (input_data->>'locker_qty')::INTEGER;
    var_available_count INTEGER;
    return_data JSON;
BEGIN
    SELECT COUNT(*)::INTEGER
    INTO var_available_count
    FROM (
        SELECT location_locker_id
        FROM public.location_locker_table AS location_locker
        WHERE location_locker.mailroom_location_id = input_location_id
          AND location_locker.location_locker_is_available = TRUE
        LIMIT input_locker_qty
    ) AS subquery;

    return_data := json_build_object(
        'available', var_available_count >= input_locker_qty,
        'count', var_available_count
    );

    RETURN return_data;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_registration_amount(input_data JSON)
RETURNS NUMERIC
SET search_path TO ''
AS $$
DECLARE
    input_plan_id UUID := (input_data->>'plan_id')::UUID;
    input_locker_qty INTEGER := (input_data->>'locker_qty')::INTEGER;
    input_months INTEGER := (input_data->>'months')::INTEGER;
    input_referral_code TEXT := COALESCE((input_data->>'referral_code')::TEXT, NULL);
    var_plan_price NUMERIC;
    var_referrer_exists BOOLEAN := FALSE;
    return_data NUMERIC;
BEGIN
    SELECT mailroom_plan_price
    INTO var_plan_price
    FROM public.mailroom_plan_table AS mailroom_plan
    WHERE mailroom_plan.mailroom_plan_id = input_plan_id;

    IF var_plan_price IS NULL THEN
        RAISE EXCEPTION 'Invalid plan selected';
    END IF;

    return_data := var_plan_price * input_locker_qty * input_months;

    IF input_months = 12 THEN
        return_data := return_data * 0.8;
    END IF;

    IF input_referral_code IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 
            FROM public.users_table AS users
            WHERE users.users_referral_code = input_referral_code
        ) INTO var_referrer_exists;

        IF var_referrer_exists THEN
            return_data := return_data * 0.95;
        END IF;
    END IF;

    RETURN return_data;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_mailroom_registration(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
    input_user_id UUID := (input_data->>'user_id')::UUID;
    input_location_id UUID := (input_data->>'location_id')::UUID;
    input_plan_id UUID := (input_data->>'plan_id')::UUID;
    input_locker_qty INTEGER := (input_data->>'locker_qty')::INTEGER;
    input_mailroom_code TEXT := (input_data->>'mailroom_code')::TEXT;
    var_registration_id UUID;
    var_locker_ids UUID[];
    var_registration_record RECORD;
    return_data JSON;
BEGIN
    INSERT INTO public.mailroom_registration_table (
        user_id,
        mailroom_location_id,
        mailroom_plan_id,
        mailroom_registration_code,
        mailroom_registration_status
    )
    VALUES (
        input_user_id,
        input_location_id,
        input_plan_id,
        input_mailroom_code,
        TRUE
    )
    RETURNING mailroom_registration_id INTO var_registration_id;

    var_locker_ids := ARRAY(
        SELECT location_locker_id
        FROM public.location_locker_table AS location_locker
        WHERE location_locker.mailroom_location_id = input_location_id
          AND location_locker.location_locker_is_available = TRUE
        LIMIT input_locker_qty
        FOR UPDATE
    );

    IF array_length(var_locker_ids, 1) < input_locker_qty THEN
        RAISE EXCEPTION 'Insufficient lockers available';
    END IF;

    UPDATE public.location_locker_table AS location_locker
    SET location_locker_is_available = FALSE
    WHERE location_locker.location_locker_id = ANY(var_locker_ids);

    INSERT INTO public.mailroom_assigned_locker_table (
        mailroom_registration_id,
        location_locker_id,
        mailroom_assigned_locker_status
    )
    SELECT 
        var_registration_id,
        locker_id,
        'Normal'
    FROM unnest(var_locker_ids) AS locker_id;

    SELECT * INTO var_registration_record 
    FROM public.mailroom_registration_table 
    WHERE mailroom_registration_id = var_registration_id;

    return_data := json_build_object(
        'registration', row_to_json(var_registration_record),
        'lockerIds', var_locker_ids
    );

    RETURN return_data;
END;
$$ LANGUAGE plpgsql;

-- Mailroom Availability RPCs (from 20251229000016)
CREATE OR REPLACE FUNCTION public.get_mailroom_locations(input_data JSON DEFAULT '{}'::JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
    return_data JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'id', mailroom_location_id,
            'name', mailroom_location_name,
            'region', mailroom_location_region,
            'city', mailroom_location_city,
            'barangay', mailroom_location_barangay,
            'zip', mailroom_location_zip
        )
    )
    INTO return_data
    FROM (
        SELECT 
            mailroom_location_id,
            mailroom_location_name,
            mailroom_location_region,
            mailroom_location_city,
            mailroom_location_barangay,
            mailroom_location_zip
        FROM public.mailroom_location_table
        ORDER BY mailroom_location_name ASC
    ) AS mailroom_location_table;

    RETURN COALESCE(return_data, '[]'::JSON);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_location_availability(input_data JSON DEFAULT '{}'::JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
    return_data JSON;
BEGIN
    SELECT json_object_agg(mailroom_location_id, locker_count)
    INTO return_data
    FROM (
        SELECT 
            mailroom_location_id,
            COUNT(*)::INTEGER as locker_count
        FROM public.location_locker_table
        WHERE location_locker_is_available = TRUE
        GROUP BY mailroom_location_id
    ) AS location_locker_counts;

    RETURN COALESCE(return_data, '{}'::JSON);
END;
$$ LANGUAGE plpgsql;

-- Admin Mailroom Locations RPCs (from 20251226000011)
CREATE OR REPLACE FUNCTION public.admin_list_mailroom_locations()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  return_data JSON := '[]'::JSON;
BEGIN
  SELECT COALESCE(
    JSON_AGG(
      JSON_BUILD_OBJECT(
        'mailroom_location_id', mailroom_location_id,
        'mailroom_location_name', mailroom_location_name,
        'mailroom_location_region', mailroom_location_region,
        'mailroom_location_city', mailroom_location_city,
        'mailroom_location_barangay', mailroom_location_barangay,
        'mailroom_location_zip', mailroom_location_zip,
        'mailroom_location_total_lockers', mailroom_location_total_lockers,
        'mailroom_location_prefix', mailroom_location_prefix
      )
      ORDER BY mailroom_location_name ASC
    ),
    '[]'::JSON
  )
  INTO  return_data
  FROM public.mailroom_location_table;

  RETURN  return_data;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_mailroom_location(
  input_name TEXT,
  input_code TEXT DEFAULT NULL,
  input_region TEXT DEFAULT NULL,
  input_city TEXT DEFAULT NULL,
  input_barangay TEXT DEFAULT NULL,
  input_zip TEXT DEFAULT NULL,
  input_total_lockers INTEGER DEFAULT 0
)
RETURNS public.mailroom_location_table
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  new_location public.mailroom_location_table%ROWTYPE;
  locker_prefix TEXT;
  total_lockers INTEGER := COALESCE(input_total_lockers, 0);
BEGIN
  IF COALESCE(TRIM(input_name), '') = '' THEN
    RAISE EXCEPTION 'mailroom location name is required';
  END IF;

  INSERT INTO public.mailroom_location_table (
    mailroom_location_name,
    mailroom_location_prefix,
    mailroom_location_region,
    mailroom_location_city,
    mailroom_location_barangay,
    mailroom_location_zip,
    mailroom_location_total_lockers
  )
  VALUES (
    TRIM(input_name),
    NULLIF(TRIM(input_code), ''),
    NULLIF(TRIM(input_region), ''),
    NULLIF(TRIM(input_city), ''),
    NULLIF(TRIM(input_barangay), ''),
    NULLIF(TRIM(input_zip), ''),
    total_lockers
  )
  RETURNING * INTO new_location;

  locker_prefix :=
    COALESCE(new_location.mailroom_location_prefix, 'L');

  IF total_lockers > 0 THEN
    INSERT INTO public.location_locker_table (
      mailroom_location_id,
      location_locker_code,
      location_locker_is_available
    )
    SELECT
      new_location.mailroom_location_id,
      FORMAT('%s-%s', locker_prefix, seq),
      true
    FROM generate_series(1, total_lockers) AS seq;
  END IF;

  RETURN new_location;
END;
$$;

-- Admin Mailroom Plans RPCs (from 20251226000012)
CREATE OR REPLACE FUNCTION public.admin_list_mailroom_plans()
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
        'mailroom_plan_id', mailroom_plan_id,
        'mailroom_plan_name', mailroom_plan_name,
        'mailroom_plan_price', mailroom_plan_price,
        'mailroom_plan_description', mailroom_plan_description,
        'mailroom_plan_storage_limit', mailroom_plan_storage_limit,
        'mailroom_plan_can_receive_mail', mailroom_plan_can_receive_mail,
        'mailroom_plan_can_receive_parcels', mailroom_plan_can_receive_parcels,
        'mailroom_plan_can_digitize', mailroom_plan_can_digitize
      )
      ORDER BY mailroom_plan_price ASC
    ),
    '[]'::JSON
  )
  INTO result
  FROM public.mailroom_plan_table;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_mailroom_plan(
  input_plan_id UUID,
  input_updates JSONB
)
RETURNS public.mailroom_plan_table
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  updated_plan public.mailroom_plan_table%ROWTYPE;
BEGIN
  IF input_plan_id IS NULL THEN
    RAISE EXCEPTION 'plan id is required';
  END IF;

  IF input_updates IS NULL OR jsonb_typeof(input_updates) <> 'object' THEN
    RAISE EXCEPTION 'input_updates must be a JSON object';
  END IF;

  UPDATE public.mailroom_plan_table
  SET
    mailroom_plan_name = CASE
      WHEN input_updates ? 'name'
        THEN COALESCE(NULLIF(TRIM(input_updates->>'name'), ''), mailroom_plan_name)
      ELSE mailroom_plan_name
    END,
    mailroom_plan_price = CASE
      WHEN input_updates ? 'price'
        THEN (input_updates->>'price')::NUMERIC
      ELSE mailroom_plan_price
    END,
    mailroom_plan_description = CASE
      WHEN input_updates ? 'description'
        THEN input_updates->>'description'
      ELSE mailroom_plan_description
    END,
    mailroom_plan_storage_limit = CASE
      WHEN input_updates ? 'storage_limit'
        THEN (input_updates->>'storage_limit')::NUMERIC
      ELSE mailroom_plan_storage_limit
    END,
    mailroom_plan_can_receive_mail = CASE
      WHEN input_updates ? 'can_receive_mail'
        THEN COALESCE((input_updates->>'can_receive_mail')::BOOLEAN, mailroom_plan_can_receive_mail)
      ELSE mailroom_plan_can_receive_mail
    END,
    mailroom_plan_can_receive_parcels = CASE
      WHEN input_updates ? 'can_receive_parcels'
        THEN COALESCE((input_updates->>'can_receive_parcels')::BOOLEAN, mailroom_plan_can_receive_parcels)
      ELSE mailroom_plan_can_receive_parcels
    END,
    mailroom_plan_can_digitize = CASE
      WHEN input_updates ? 'can_digitize'
        THEN COALESCE((input_updates->>'can_digitize')::BOOLEAN, mailroom_plan_can_digitize)
      ELSE mailroom_plan_can_digitize
    END
  WHERE mailroom_plan_id = input_plan_id
  RETURNING *
  INTO updated_plan;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'plan not found';
  END IF;

  RETURN updated_plan;
END;
$$;

-- Admin Mailroom Packages RPC (from 20251227000013)
CREATE OR REPLACE FUNCTION public.get_admin_mailroom_packages(
  input_limit INTEGER DEFAULT 50,
  input_offset INTEGER DEFAULT 0,
  input_compact BOOLEAN DEFAULT false
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  result JSON;
  packages_json JSON;
  registrations_json JSON;
  lockers_json JSON;
  assigned_lockers_json JSON;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count
  FROM public.mailbox_item_table
  WHERE mailbox_item_deleted_at IS NULL;

  WITH paginated_items AS (
    SELECT 
      mi.mailbox_item_id,
      mi.mailbox_item_name,
      mi.mailroom_registration_id,
      mi.location_locker_id,
      mi.mailbox_item_type,
      mi.mailbox_item_status,
      mi.mailbox_item_photo,
      mi.mailbox_item_received_at,
      mi.mailbox_item_created_at,
      mi.mailbox_item_updated_at,
      mr.mailroom_registration_id AS reg_id,
      mr.mailroom_registration_code,
      ll.location_locker_id AS locker_id,
      ll.location_locker_code,
      u.users_email,
      u.mobile_number,
      uk.user_kyc_first_name,
      uk.user_kyc_last_name,
      ml.mailroom_location_name,
      p.mailroom_plan_id,
      p.mailroom_plan_name,
      p.mailroom_plan_can_receive_mail,
      p.mailroom_plan_can_receive_parcels
    FROM public.mailbox_item_table mi
    LEFT JOIN public.mailroom_registration_table mr ON mr.mailroom_registration_id = mi.mailroom_registration_id
    LEFT JOIN public.location_locker_table ll ON ll.location_locker_id = mi.location_locker_id
    LEFT JOIN public.users_table u ON u.users_id = mr.user_id
    LEFT JOIN public.user_kyc_table uk ON uk.user_id = u.users_id
    LEFT JOIN public.mailroom_location_table ml ON ml.mailroom_location_id = mr.mailroom_location_id
    LEFT JOIN public.mailroom_plan_table p ON p.mailroom_plan_id = mr.mailroom_plan_id
    WHERE mi.mailbox_item_deleted_at IS NULL
    ORDER BY mi.mailbox_item_received_at DESC NULLS LAST
    LIMIT input_limit
    OFFSET input_offset
  )
  SELECT COALESCE(
    JSON_AGG(
      JSON_BUILD_OBJECT(
        'id', pi.mailbox_item_id,
        'package_name', pi.mailbox_item_name,
        'registration_id', pi.mailroom_registration_id,
        'locker_id', pi.location_locker_id,
        'package_type', pi.mailbox_item_type,
        'status', pi.mailbox_item_status,
        'package_photo', pi.mailbox_item_photo,
        'received_at', pi.mailbox_item_received_at,
        'mailbox_item_created_at', pi.mailbox_item_created_at,
        'mailbox_item_updated_at', pi.mailbox_item_updated_at,
        'registration', CASE
          WHEN pi.reg_id IS NOT NULL THEN JSON_BUILD_OBJECT(
            'id', pi.reg_id,
            'full_name', COALESCE(
              CONCAT_WS(' ', pi.user_kyc_first_name, pi.user_kyc_last_name),
              pi.mailroom_location_name,
              'Unknown'
            ),
            'email', pi.users_email,
            'mobile', pi.mobile_number,
            'mailroom_code', pi.mailroom_registration_code,
            'mailroom_plans', CASE
              WHEN pi.mailroom_plan_id IS NOT NULL THEN JSON_BUILD_OBJECT(
                'name', pi.mailroom_plan_name,
                'can_receive_mail', pi.mailroom_plan_can_receive_mail,
                'can_receive_parcels', pi.mailroom_plan_can_receive_parcels
              )
              ELSE NULL
            END
          )
          ELSE NULL
        END,
        'locker', CASE
          WHEN pi.locker_id IS NOT NULL THEN JSON_BUILD_OBJECT(
            'id', pi.locker_id,
            'locker_code', pi.location_locker_code
          )
          ELSE NULL
        END
      )
    ),
    '[]'::JSON
  )
  INTO packages_json
  FROM paginated_items pi;

  SELECT COALESCE(
    JSON_AGG(
      JSON_BUILD_OBJECT(
        'id', mr.mailroom_registration_id,
        'full_name', COALESCE(
          CONCAT_WS(' ', uk.user_kyc_first_name, uk.user_kyc_last_name),
          ml.mailroom_location_name,
          'Unknown'
        ),
        'email', u.users_email,
        'mobile', u.mobile_number,
        'mailroom_code', mr.mailroom_registration_code,
        'mailroom_plans', CASE
          WHEN p.mailroom_plan_id IS NOT NULL THEN JSON_BUILD_OBJECT(
            'name', p.mailroom_plan_name,
            'can_receive_mail', p.mailroom_plan_can_receive_mail,
            'can_receive_parcels', p.mailroom_plan_can_receive_parcels
          )
          ELSE NULL
        END
      )
    ),
    '[]'::JSON
  )
  INTO registrations_json
  FROM public.mailroom_registration_table mr
  LEFT JOIN public.users_table u ON u.users_id = mr.user_id
  LEFT JOIN public.user_kyc_table uk ON uk.user_id = u.users_id
  LEFT JOIN public.mailroom_location_table ml ON ml.mailroom_location_id = mr.mailroom_location_id
  LEFT JOIN public.mailroom_plan_table p ON p.mailroom_plan_id = mr.mailroom_plan_id;

  SELECT COALESCE(
    JSON_AGG(
      JSON_BUILD_OBJECT(
        'id', ll.location_locker_id,
        'locker_code', ll.location_locker_code,
        'is_available', ll.location_locker_is_available
      )
    ),
    '[]'::JSON
  )
  INTO lockers_json
  FROM public.location_locker_table ll;

  SELECT COALESCE(
    JSON_AGG(
      JSON_BUILD_OBJECT(
        'id', mal.mailroom_assigned_locker_id,
        'registration_id', mal.mailroom_registration_id,
        'locker_id', mal.location_locker_id,
        'status', mal.mailroom_assigned_locker_status,
        'locker', CASE
          WHEN ll.location_locker_id IS NOT NULL THEN JSON_BUILD_OBJECT(
            'id', ll.location_locker_id,
            'locker_code', ll.location_locker_code
          )
          ELSE NULL
        END
      )
    ),
    '[]'::JSON
  )
  INTO assigned_lockers_json
  FROM public.mailroom_assigned_locker_table mal
  LEFT JOIN public.location_locker_table ll ON ll.location_locker_id = mal.location_locker_id;

  result := JSON_BUILD_OBJECT(
    'packages', packages_json,
    'registrations', registrations_json,
    'lockers', lockers_json,
    'assignedLockers', assigned_lockers_json,
    'total_count', total_count
  );

  RETURN result;
END;
$$;

-- Payment Transaction RPC (from 20260102000018)
CREATE OR REPLACE FUNCTION public.get_payment_transaction_by_order(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
    input_order_id TEXT := (input_data->>'order_id')::TEXT;
    return_data JSON;
BEGIN
    SELECT json_build_object(
        'payment_transaction_id', payment_transaction.payment_transaction_id,
        'payment_transaction_amount', payment_transaction.payment_transaction_amount,
        'payment_transaction_status', payment_transaction.payment_transaction_status,
        'payment_transaction_reference_id', payment_transaction.payment_transaction_reference_id,
        'payment_transaction_order_id', payment_transaction.payment_transaction_order_id,
        'payment_transaction_created_at', payment_transaction.payment_transaction_created_at,
        'mailroom_registration_id', payment_transaction.mailroom_registration_id
    )
    INTO return_data
    FROM public.payment_transaction_table AS payment_transaction
    WHERE payment_transaction.payment_transaction_order_id = input_order_id
    ORDER BY payment_transaction.payment_transaction_created_at DESC
    LIMIT 1;

    RETURN return_data;
END;
$$ LANGUAGE plpgsql;

-- Get Mailroom Registration by Order RPC (from 20260102000019)
CREATE OR REPLACE FUNCTION public.get_mailroom_registration_by_order(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
    input_order_id TEXT := (input_data->>'order_id')::TEXT;
    var_registration_id UUID;
    return_data JSON;
BEGIN
    SELECT payment_transaction.mailroom_registration_id
    INTO var_registration_id
    FROM public.payment_transaction_table AS payment_transaction
    WHERE payment_transaction.payment_transaction_order_id = input_order_id
    ORDER BY payment_transaction.payment_transaction_created_at DESC
    LIMIT 1;

    IF var_registration_id IS NOT NULL THEN
        SELECT row_to_json(mailroom_registration)
        INTO return_data
        FROM public.mailroom_registration_table AS mailroom_registration
        WHERE mailroom_registration.mailroom_registration_id = var_registration_id;
    END IF;

    RETURN return_data;
END;
$$ LANGUAGE plpgsql;

-- Finalize Registration RPC (from 20260102000020)
DROP FUNCTION IF EXISTS public.finalize_registration_from_payment(JSON);
DROP FUNCTION IF EXISTS public.finalize_registration_from_payment(JSONB);

CREATE OR REPLACE FUNCTION public.finalize_registration_from_payment(input_data JSONB)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
    input_payment_id TEXT := (input_data->>'payment_id')::TEXT;
    input_order_id TEXT := (input_data->>'order_id')::TEXT;
    input_user_id UUID := (input_data->>'user_id')::UUID;
    input_location_id UUID := (input_data->>'location_id')::UUID;
    input_plan_id UUID := (input_data->>'plan_id')::UUID;
    input_locker_qty INTEGER := COALESCE((input_data->>'locker_qty')::INTEGER, 1);
    input_months INTEGER := COALESCE((input_data->>'months')::INTEGER, 1);
    input_amount NUMERIC := COALESCE((input_data->>'amount')::NUMERIC, 0);
    var_existing_registration_id UUID;
    var_available_locker_ids UUID[];
    var_mailroom_code TEXT;
    var_is_unique BOOLEAN;
    var_attempts INTEGER;
    var_registration_id UUID;
    var_expires_at TIMESTAMPTZ;
    var_amount_decimal NUMERIC;
BEGIN
    SELECT mailroom_registration_id
    INTO var_existing_registration_id
    FROM public.payment_transaction_table
    WHERE payment_transaction_order_id = input_order_id
    ORDER BY payment_transaction_created_at DESC
    LIMIT 1;

    IF var_existing_registration_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM public.mailroom_registration_table
            WHERE mailroom_registration_id = var_existing_registration_id
            AND mailroom_registration_status = TRUE
        ) THEN
            RETURN json_build_object(
                'success', TRUE,
                'message', 'Registration already finalized',
                'registration_id', var_existing_registration_id
            );
        END IF;
    END IF;

    SELECT ARRAY(
        SELECT location_locker_id
        FROM public.location_locker_table
        WHERE mailroom_location_id = input_location_id
          AND location_locker_is_available = TRUE
        LIMIT input_locker_qty
    ) INTO var_available_locker_ids;

    IF array_length(var_available_locker_ids, 1) IS NULL OR array_length(var_available_locker_ids, 1) < input_locker_qty THEN
        RETURN json_build_object(
            'success', FALSE,
            'message', 'Insufficient lockers available',
            'available_count', COALESCE(array_length(var_available_locker_ids, 1), 0),
            'needed', input_locker_qty
        );
    END IF;

    var_is_unique := FALSE;
    var_attempts := 0;
    WHILE var_is_unique = FALSE AND var_attempts < 10 LOOP
        var_mailroom_code := 'KPH-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 4));
        SELECT NOT EXISTS (
            SELECT 1 FROM public.mailroom_registration_table
            WHERE mailroom_registration_code = var_mailroom_code
        ) INTO var_is_unique;
        var_attempts := var_attempts + 1;
    END LOOP;

    IF NOT var_is_unique THEN
        RETURN json_build_object(
            'success', FALSE,
            'message', 'Failed to generate unique mailroom code'
        );
    END IF;

    INSERT INTO public.mailroom_registration_table (
        user_id,
        mailroom_location_id,
        mailroom_plan_id,
        mailroom_registration_code,
        mailroom_registration_status
    ) VALUES (
        input_user_id,
        input_location_id,
        input_plan_id,
        var_mailroom_code,
        TRUE
    )
    RETURNING mailroom_registration_id INTO var_registration_id;

    var_expires_at := NOW() + (input_months || ' months')::INTERVAL;

    INSERT INTO public.subscription_table (
        mailroom_registration_id,
        subscription_billing_cycle,
        subscription_expires_at
    ) VALUES (
        var_registration_id,
        (CASE WHEN input_months >= 12 THEN 'ANNUAL' ELSE 'MONTHLY' END)::public.billing_cycle,
        var_expires_at
    );

    var_amount_decimal := input_amount / 100.0;

    INSERT INTO public.payment_transaction_table (
        mailroom_registration_id,
        payment_transaction_amount,
        payment_transaction_status,
        payment_transaction_type,
        payment_transaction_reference_id,
        payment_transaction_order_id
    ) VALUES (
        var_registration_id,
        var_amount_decimal,
        'PAID'::public.payment_status,
        'SUBSCRIPTION'::public.payment_type,
        input_payment_id,
        input_order_id
    );

    UPDATE public.location_locker_table
    SET location_locker_is_available = FALSE
    WHERE location_locker_id = ANY(var_available_locker_ids);

    INSERT INTO public.mailroom_assigned_locker_table (
        mailroom_registration_id,
        location_locker_id,
        mailroom_assigned_locker_status
    )
    SELECT var_registration_id, unnest(var_available_locker_ids), 'Normal'::public.mailroom_assigned_locker_status;

    RETURN json_build_object(
        'success', TRUE,
        'message', 'Registration finalized successfully',
        'registration_id', var_registration_id,
        'mailroom_code', var_mailroom_code
    );
END;
$$ LANGUAGE plpgsql;

-- Referral RPCs (from 20260102000021)
CREATE OR REPLACE FUNCTION public.referral_add(input_data JSONB)
RETURNS JSONB
SET search_path TO ''
AS $$
DECLARE
    input_user_id UUID := (input_data->>'user_id')::UUID;
    input_referral_code TEXT := (input_data->>'referral_code')::TEXT;
    input_referred_email TEXT := (input_data->>'referred_email')::TEXT;
    input_service_type TEXT := (input_data->>'service_type')::TEXT;
    var_referrer_id UUID;
    var_referred_id UUID;
BEGIN
    IF input_referral_code IS NOT NULL THEN
        SELECT users_id INTO var_referrer_id
        FROM public.users_table
        WHERE users_referral_code = input_referral_code;
        
        IF var_referrer_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'message', 'Invalid referral code');
        END IF;
    ELSE
        var_referrer_id := input_user_id;
    END IF;

    IF var_referrer_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Could not resolve referrer');
    END IF;

    SELECT users_id INTO var_referred_id
    FROM public.users_table
    WHERE users_email = input_referred_email;

    INSERT INTO public.referral_table (
        referral_referrer_user_id,
        referral_referred_user_id,
        referral_service_type
    ) VALUES (
        var_referrer_id,
        var_referred_id,
        input_service_type
    );

    RETURN jsonb_build_object('success', true, 'message', 'Referral added');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.referral_generate(input_data JSONB)
RETURNS JSONB
SET search_path TO ''
AS $$
DECLARE
    input_user_id UUID := (input_data->>'user_id')::UUID;
    var_existing_code TEXT;
    var_new_code TEXT;
BEGIN
    SELECT users_referral_code INTO var_existing_code
    FROM public.users_table
    WHERE users_id = input_user_id;

    IF var_existing_code IS NOT NULL THEN
        RETURN jsonb_build_object('success', true, 'referral_code', var_existing_code);
    END IF;

    var_new_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8));

    UPDATE public.users_table
    SET users_referral_code = var_new_code
    WHERE users_id = input_user_id;

    RETURN jsonb_build_object('success', true, 'referral_code', var_new_code);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.referral_list(input_data JSONB)
RETURNS JSONB
SET search_path TO ''
AS $$
DECLARE
    input_user_id UUID := (input_data->>'user_id')::UUID;
    var_referrals JSONB;
BEGIN
    SELECT jsonb_agg(r.*) INTO var_referrals
    FROM public.referral_table r
    WHERE r.referral_referrer_user_id = input_user_id 
       OR r.referral_referred_user_id = input_user_id;

    RETURN jsonb_build_object('success', true, 'referrals', COALESCE(var_referrals, '[]'::jsonb));
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.referral_validate(input_data JSONB)
RETURNS JSONB
SET search_path TO ''
AS $$
DECLARE
    input_code TEXT := (input_data->>'code')::TEXT;
    input_current_user_id UUID := (input_data->>'current_user_id')::UUID;
    var_referrer_id UUID;
BEGIN
    IF input_code IS NULL THEN
        RETURN jsonb_build_object('valid', false, 'message', 'Code is required');
    END IF;

    SELECT users_id INTO var_referrer_id
    FROM public.users_table
    WHERE users_referral_code = input_code;

    IF var_referrer_id IS NULL THEN
        RETURN jsonb_build_object('valid', false, 'message', 'Invalid referral code');
    END IF;

    IF input_current_user_id IS NOT NULL AND var_referrer_id = input_current_user_id THEN
        RETURN jsonb_build_object('valid', false, 'message', 'Cannot use your own code');
    END IF;

    RETURN jsonb_build_object('valid', true, 'message', 'Code applied: 5% Off');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STORAGE POLICIES (from 20251230000016)
-- ============================================================================

DROP POLICY IF EXISTS packages_photo_policy ON storage.objects;
CREATE POLICY packages_photo_policy
ON storage.objects
FOR ALL
USING (
  bucket_id = 'PACKAGES-PHOTO' 
  AND (
    owner = auth.uid() 
    OR split_part(name, '/', 1) = auth.uid()::text
    OR EXISTS (
      SELECT 1 
      FROM public.users_table 
      WHERE users_id = auth.uid() 
      AND users_role = 'admin'
    )
  )
);

-- ============================================================================
-- GRANT PERMISSIONS (from 20251230000017)
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.get_user_mailroom_registration(JSON) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_mailroom_registration(JSON) TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_assigned_lockers(JSON) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_assigned_lockers(JSON) TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_mailbox_items_by_registrations(JSON) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_mailbox_items_by_registrations(JSON) TO anon;
GRANT EXECUTE ON FUNCTION public.cancel_user_mailroom_subscription(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_user_mailroom_subscription(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_admin_mailroom_packages(INTEGER, INTEGER, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_mailroom_packages(INTEGER, INTEGER, BOOLEAN) TO anon;

-- Add unique constraint to payment_transaction_order_id to prevent duplicate registrations
ALTER TABLE public.payment_transaction_table 
ADD CONSTRAINT payment_transaction_table_order_id_unique UNIQUE (payment_transaction_order_id);

-- ============================================================================
-- ADDITIONAL RPC FUNCTIONS (2026-01-05)
-- ============================================================================

-- Create RPC to get user mailroom registration stats
CREATE OR REPLACE FUNCTION get_user_mailroom_registrations_stat(input_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    return_data JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'mailroom_registration_id', stats.mailroom_registration_id,
            'stored', stats.stored,
            'pending', stats.pending,
            'released', stats.released
        )
    )
    INTO return_data
    FROM (
        SELECT 
            mit.mailroom_registration_id,
            COUNT(*) FILTER (
                WHERE mit.mailbox_item_status::TEXT NOT IN ('RELEASED', 'RETRIEVED', 'DISPOSED')
                OR mit.mailbox_item_status::TEXT IN ('REQUEST_TO_SCAN', 'REQUEST_TO_RELEASE', 'REQUEST_TO_DISPOSE')
            ) AS stored,
            COUNT(*) FILTER (
                WHERE mit.mailbox_item_status::TEXT LIKE 'REQUEST%'
            ) AS pending,
            COUNT(*) FILTER (
                WHERE mit.mailbox_item_status::TEXT = 'RELEASED'
            ) AS released
        FROM mailbox_item_table mit
        JOIN mailroom_registration_table mrt ON mit.mailroom_registration_id = mrt.mailroom_registration_id
        WHERE mrt.user_id = input_user_id
        AND mit.mailbox_item_deleted_at IS NULL
        GROUP BY mit.mailroom_registration_id
    ) stats;

    RETURN COALESCE(return_data, '[]'::JSONB);
END;
$$;

-- Create RPC for user to request action on a mailbox item
CREATE OR REPLACE FUNCTION user_request_mailbox_item_action(input_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    var_user_id UUID;
    var_mailbox_item_id UUID;
    var_status TEXT;
    var_selected_address_id UUID;
    var_notes JSONB;
    var_release_to_name TEXT;
    var_registration_id UUID;
    var_owner_id UUID;
    var_action_type TEXT;
    var_insert_obj JSONB;
    var_release_info JSONB := '{}'::JSONB;
    var_formatted_address TEXT;
    var_return_data JSONB;
BEGIN
    var_user_id := (input_data->>'user_id')::UUID;
    var_mailbox_item_id := (input_data->>'mailbox_item_id')::UUID;
    var_status := input_data->>'status';
    var_selected_address_id := (input_data->>'selected_address_id')::UUID;
    var_notes := COALESCE((input_data->>'notes')::JSONB, '{}'::JSONB);
    var_release_to_name := input_data->>'release_to_name';

    -- 1. Verify ownership
    SELECT mit.mailroom_registration_id INTO var_registration_id
    FROM mailbox_item_table mit
    WHERE mit.mailbox_item_id = var_mailbox_item_id;

    IF var_registration_id IS NULL THEN
        RAISE EXCEPTION 'Mailbox item not found';
    END IF;

    SELECT mrt.user_id INTO var_owner_id
    FROM mailroom_registration_table mrt
    WHERE mrt.mailroom_registration_id = var_registration_id;

    IF var_owner_id <> var_user_id THEN
        RAISE EXCEPTION 'Forbidden';
    END IF;

    -- 2. Handle status update
    IF var_status IS NOT NULL THEN
        IF var_status NOT IN ('STORED', 'RELEASED', 'RETRIEVED', 'DISPOSED', 'REQUEST_TO_RELEASE', 'REQUEST_TO_DISPOSE', 'REQUEST_TO_SCAN') THEN
            RAISE EXCEPTION 'Invalid status';
        END IF;

        UPDATE mailbox_item_table
        SET mailbox_item_status = var_status::mailroom_package_status,
            mailbox_item_updated_at = NOW()
        WHERE mailbox_item_id = var_mailbox_item_id;
    END IF;

    -- 3. Handle address selection
    IF input_data ? 'selected_address_id' THEN
        IF var_selected_address_id IS NOT NULL THEN
            SELECT 
                COALESCE(uat.user_address_label, '') || ', ' ||
                COALESCE(uat.user_address_line1, '') || ', ' ||
                COALESCE(uat.user_address_line2, '') || ', ' ||
                COALESCE(uat.user_address_city, '') || ', ' ||
                COALESCE(uat.user_address_region, '') || ', ' ||
                COALESCE(uat.user_address_postal::TEXT, '')
            INTO var_formatted_address
            FROM user_address_table uat
            WHERE uat.user_address_id = var_selected_address_id
            AND uat.user_id = var_user_id;

            IF var_formatted_address IS NULL THEN
                RAISE EXCEPTION 'Address not found or unauthorized';
            END IF;

            UPDATE mailbox_item_table
            SET user_address_id = var_selected_address_id,
                mailbox_item_release_address = var_formatted_address
            WHERE mailbox_item_id = var_mailbox_item_id;
            
            var_release_info := var_release_info || jsonb_build_object(
                'user_address_id', var_selected_address_id,
                'release_address', var_formatted_address
            );
        ELSE
            UPDATE mailbox_item_table
            SET user_address_id = NULL,
                mailbox_item_release_address = NULL
            WHERE mailbox_item_id = var_mailbox_item_id;
        END IF;
    END IF;

    -- 4. Create action request if needed
    var_action_type := CASE 
        WHEN var_status = 'REQUEST_TO_RELEASE' THEN 'RELEASE'
        WHEN var_status = 'REQUEST_TO_DISPOSE' THEN 'DISPOSE'
        WHEN var_status = 'REQUEST_TO_SCAN' THEN 'SCAN'
        ELSE NULL
    END;

    IF var_action_type IS NOT NULL THEN
        IF var_action_type = 'RELEASE' THEN
            -- Build release info for JSON storage
            IF var_notes ? 'pickup_on_behalf' AND (var_notes->'pickup_on_behalf')::BOOLEAN THEN
                var_release_info := var_release_info || jsonb_build_object(
                    'pickup_on_behalf', jsonb_build_object(
                        'name', var_notes->>'name',
                        'mobile', var_notes->>'mobile',
                        'contact_mode', var_notes->>'contact_mode'
                    )
                );
            END IF;

            IF var_release_to_name IS NOT NULL THEN
                var_release_info := var_release_info || jsonb_build_object('release_to_name', var_release_to_name);
            END IF;
        END IF;

        INSERT INTO mail_action_request_table (
            mailbox_item_id,
            user_id,
            mail_action_request_type,
            mail_action_request_status,
            mail_action_request_forward_address,
            mail_action_request_forward_tracking_number,
            mail_action_request_forward_3pl_name,
            mail_action_request_forward_tracking_url
        )
        VALUES (
            var_mailbox_item_id,
            var_user_id,
            var_action_type::mail_action_request_type,
            'PROCESSING',
            CASE WHEN jsonb_array_length(jsonb_path_query_array(var_release_info, '$.*')) > 0 THEN var_release_info::TEXT ELSE input_data->>'forward_address' END,
            input_data->>'forward_tracking_number',
            input_data->>'forward_3pl_name',
            input_data->>'forward_tracking_url'
        );
    END IF;

    -- 5. Construct return data
    SELECT row_to_json(mit)::JSONB INTO var_return_data
    FROM mailbox_item_table mit
    WHERE mit.mailbox_item_id = var_mailbox_item_id;

    RETURN var_return_data;
END;
$$;

-- Create RPC for fetching user session data
CREATE OR REPLACE FUNCTION get_user_session_data(input_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    var_profile JSONB;
    var_kyc JSONB;
    var_return_data JSONB;
BEGIN
    -- 1. Fetch profile data from users_table
    SELECT jsonb_build_object(
        'users_id', ut.users_id,
        'users_email', ut.users_email,
        'users_role', ut.users_role,
        'users_avatar_url', ut.users_avatar_url,
        'users_referral_code', ut.users_referral_code,
        'users_is_verified', ut.users_is_verified,
        'mobile_number', ut.mobile_number
    )
    INTO var_profile
    FROM users_table ut
    WHERE ut.users_id = input_user_id;

    -- 2. Fetch KYC status
    SELECT jsonb_build_object(
        'status', COALESCE(uk.user_kyc_status, 'SUBMITTED')
    )
    INTO var_kyc
    FROM user_kyc_table uk
    WHERE uk.user_id = input_user_id;

    -- 3. Construct return data
    var_return_data := jsonb_build_object(
        'profile', var_profile,
        'kyc', var_kyc,
        'role', var_profile->>'users_role'
    );

    RETURN var_return_data;
END;
$$;

-- Create RPC for KYC submission
CREATE OR REPLACE FUNCTION user_submit_kyc(input_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    var_user_id UUID;
    var_kyc_id UUID;
    var_return_data JSONB;
BEGIN
    var_user_id := (input_data->>'user_id')::UUID;

    -- Upsert KYC record
    INSERT INTO user_kyc_table (
        user_id,
        user_kyc_status, 
        user_kyc_id_document_type,
        user_kyc_id_front_url,
        user_kyc_id_back_url,
        user_kyc_id_number,
        user_kyc_first_name,
        user_kyc_last_name,
        user_kyc_date_of_birth,
        user_kyc_agreements_accepted
    )
    VALUES (
        var_user_id,
        'SUBMITTED',
        input_data->>'document_type',
        input_data->>'id_front_url',
        input_data->>'id_back_url',
        input_data->>'user_kyc_id_number',
        input_data->>'first_name',
        input_data->>'last_name',
        (input_data->>'birth_date')::DATE,
        TRUE
    )
    ON CONFLICT (user_id) DO UPDATE SET
        user_kyc_status = EXCLUDED.user_kyc_status,
        user_kyc_id_document_type = EXCLUDED.user_kyc_id_document_type,
        user_kyc_id_front_url = EXCLUDED.user_kyc_id_front_url,
        user_kyc_id_back_url = EXCLUDED.user_kyc_id_back_url,
        user_kyc_id_number = EXCLUDED.user_kyc_id_number,
        user_kyc_first_name = EXCLUDED.user_kyc_first_name,
        user_kyc_last_name = EXCLUDED.user_kyc_last_name,
        user_kyc_date_of_birth = EXCLUDED.user_kyc_date_of_birth,
        user_kyc_agreements_accepted = EXCLUDED.user_kyc_agreements_accepted
    RETURNING user_kyc_id INTO var_kyc_id;

    -- Insert address if provided
    IF input_data->>'address_line1' IS NOT NULL AND input_data->>'address_line1' <> '' THEN
        INSERT INTO user_kyc_address_table (
            user_kyc_id,
            user_kyc_address_line_one,
            user_kyc_address_line_two,
            user_kyc_address_city,
            user_kyc_address_region,
            user_kyc_address_postal_code,
            user_kyc_address_is_default
        )
        VALUES (
            var_kyc_id,
            input_data->>'address_line1',
            input_data->>'address_line2',
            input_data->>'city',
            input_data->>'region',
            (input_data->>'postal')::INTEGER,
            TRUE
        );
    END IF;

    var_return_data := jsonb_build_object(
        'ok', TRUE,
        'status', 'SUBMITTED',
        'user_kyc_id', var_kyc_id
    );

    RETURN var_return_data;
END;
$$;

-- Create RPC for user to fetch storage files and usage stats
CREATE OR REPLACE FUNCTION get_user_storage_files(input_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    var_total_limit_mb NUMERIC := 0;
    var_total_used_mb NUMERIC := 0;
    var_scans JSONB := '[]'::JSONB;
    var_return_data JSONB;
BEGIN
    -- 1. Calculate total storage limit across all user registrations
    SELECT COALESCE(SUM(mpt.mailroom_plan_storage_limit), 0)
    INTO var_total_limit_mb
    FROM mailroom_registration_table mrt
    JOIN mailroom_plan_table mpt ON mrt.mailroom_plan_id = mpt.mailroom_plan_id
    WHERE mrt.user_id = input_user_id;

    -- 2. Fetch scans and calculate total used storage
    WITH user_mailbox_items AS (
        SELECT mit.mailbox_item_id, mit.mailbox_item_name
        FROM mailbox_item_table mit
        JOIN mailroom_registration_table mrt ON mit.mailroom_registration_id = mrt.mailroom_registration_id
        WHERE mrt.user_id = input_user_id
    ),
    user_files AS (
        SELECT 
            mft.mailroom_file_id AS id,
            mft.mailroom_file_name AS file_name,
            mft.mailroom_file_url AS file_url,
            mft.mailroom_file_size_mb AS file_size_mb,
            mft.mailroom_file_mime_type AS mime_type,
            mft.mailroom_file_uploaded_at AS uploaded_at,
            mft.mailbox_item_id AS package_id,
            JSONB_BUILD_OBJECT(
                'id', umi.mailbox_item_id,
                'package_name', umi.mailbox_item_name
            ) AS package
        FROM mailroom_file_table mft
        JOIN user_mailbox_items umi ON mft.mailbox_item_id = umi.mailbox_item_id
        ORDER BY mft.mailroom_file_uploaded_at DESC
    )
    SELECT 
        COALESCE(JSONB_AGG(uf), '[]'::JSONB),
        COALESCE(SUM(uf.file_size_mb), 0)
    INTO var_scans, var_total_used_mb
    FROM user_files uf;

    -- 3. Construct return data
    var_return_data := JSONB_BUILD_OBJECT(
        'scans', var_scans,
        'usage', JSONB_BUILD_OBJECT(
            'used_mb', var_total_used_mb,
            'limit_mb', var_total_limit_mb,
            'percentage', CASE 
                WHEN var_total_limit_mb > 0 THEN LEAST((var_total_used_mb / var_total_limit_mb) * 100, 100)
                ELSE 0
            END
        )
    );

    RETURN var_return_data;
END;
$$;

-- Create RPC for user to delete a storage file
CREATE OR REPLACE FUNCTION delete_user_storage_file(input_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    var_user_id UUID;
    var_file_id UUID;
    var_registration_id UUID;
    var_owner_id UUID;
    var_file_url TEXT;
    var_return_data JSONB;
BEGIN
    var_user_id := (input_data->>'user_id')::UUID;
    var_file_id := (input_data->>'file_id')::UUID;

    -- 1. Fetch file and its registration ID
    SELECT 
        mft.mailroom_file_url,
        mit.mailroom_registration_id
    INTO 
        var_file_url,
        var_registration_id
    FROM mailroom_file_table mft
    JOIN mailbox_item_table mit ON mft.mailbox_item_id = mit.mailbox_item_id
    WHERE mft.mailroom_file_id = var_file_id;

    IF var_file_url IS NULL THEN
        RAISE EXCEPTION 'Scan not found';
    END IF;

    -- 2. Verify ownership
    SELECT mrt.user_id INTO var_owner_id
    FROM mailroom_registration_table mrt
    WHERE mrt.mailroom_registration_id = var_registration_id;

    IF var_owner_id <> var_user_id THEN
        RAISE EXCEPTION 'Forbidden';
    END IF;

    -- 3. Delete from database
    DELETE FROM mailroom_file_table
    WHERE mailroom_file_id = var_file_id;

    -- 4. Construct return data (frontend needs file_url to delete from storage)
    var_return_data := JSONB_BUILD_OBJECT(
        'success', TRUE,
        'file_url', var_file_url
    );

    RETURN var_return_data;
END;
$$;

-- Create RPC for user to fetch scans and usage for a specific registration
CREATE OR REPLACE FUNCTION get_registration_scans(input_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    var_user_id UUID;
    var_registration_id UUID;
    var_owner_id UUID;
    var_limit_mb NUMERIC := 0;
    var_used_mb NUMERIC := 0;
    var_scans JSONB := '[]'::JSONB;
    var_return_data JSONB;
BEGIN
    var_user_id := (input_data->>'user_id')::UUID;
    var_registration_id := (input_data->>'registration_id')::UUID;

    -- 1. Verify ownership and retrieve plan storage limit
    SELECT 
        mrt.user_id,
        COALESCE(mpt.mailroom_plan_storage_limit, 100)
    INTO 
        var_owner_id,
        var_limit_mb
    FROM mailroom_registration_table mrt
    JOIN mailroom_plan_table mpt ON mrt.mailroom_plan_id = mpt.mailroom_plan_id
    WHERE mrt.mailroom_registration_id = var_registration_id;

    IF var_owner_id IS NULL THEN
        RAISE EXCEPTION 'Registration not found';
    END IF;

    IF var_owner_id <> var_user_id THEN
        RAISE EXCEPTION 'You do not have permission to view these files';
    END IF;

    -- 2. Fetch scans and calculate total used storage for this registration
    WITH reg_files AS (
        SELECT 
            mft.mailroom_file_id,
            mft.mailbox_item_id,
            mft.mailroom_file_name,
            mft.mailroom_file_url,
            mft.mailroom_file_size_mb,
            mft.mailroom_file_mime_type,
            mft.mailroom_file_uploaded_at,
            mft.mailroom_file_type,
            JSONB_BUILD_OBJECT(
                'mailbox_item_id', mit.mailbox_item_id,
                'mailbox_item_name', mit.mailbox_item_name,
                'mailroom_registration_id', mit.mailroom_registration_id
            ) AS mailbox_item_table
        FROM mailroom_file_table mft
        JOIN mailbox_item_table mit ON mft.mailbox_item_id = mit.mailbox_item_id
        WHERE mit.mailroom_registration_id = var_registration_id
        ORDER BY mft.mailroom_file_uploaded_at DESC
    )
    SELECT 
        COALESCE(JSONB_AGG(rf), '[]'::JSONB),
        COALESCE(SUM(rf.mailroom_file_size_mb), 0)
    INTO var_scans, var_used_mb
    FROM reg_files rf;

    -- 3. Construct return data
    var_return_data := JSONB_BUILD_OBJECT(
        'scans', var_scans,
        'usage', JSONB_BUILD_OBJECT(
            'used_mb', var_used_mb,
            'limit_mb', var_limit_mb,
            'percentage', CASE 
                WHEN var_limit_mb > 0 THEN LEAST((var_used_mb / var_limit_mb) * 100, 100)
                ELSE 0
            END
        )
    );

    RETURN var_return_data;
END;
$$;

-- Create RPC to safely create notifications
CREATE OR REPLACE FUNCTION create_notification(input_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    var_user_id UUID;
    var_title TEXT;
    var_message TEXT;
    var_type TEXT;
    var_link TEXT;
    var_return_data JSONB;
BEGIN
    var_user_id := (input_data->>'user_id')::UUID;
    var_title := input_data->>'title';
    var_message := input_data->>'message';
    var_type := input_data->>'type';
    var_link := input_data->>'link';

    -- Insert the notification
    INSERT INTO notification_table (
        user_id,
        notification_title,
        notification_message,
        notification_type,
        notification_link,
        notification_is_read
    )
    VALUES (
        var_user_id,
        var_title,
        var_message,
        var_type::notification_type,
        var_link,
        FALSE
    );

    var_return_data := JSONB_BUILD_OBJECT('success', TRUE);
    RETURN var_return_data;
END;
$$;

-- Create RPC for admin to update a mailbox item and related data
CREATE OR REPLACE FUNCTION admin_update_mailbox_item(input_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    var_admin_id UUID;
    var_item_id UUID;
    var_package_name TEXT;
    var_registration_id UUID;
    var_locker_id UUID;
    var_package_type TEXT;
    var_status TEXT;
    var_package_photo TEXT;
    var_locker_status TEXT;
    
    var_old_status TEXT;
    var_old_registration_id UUID;
    var_old_item_name TEXT;
    
    var_updated_item JSONB;
    var_return_data JSONB;
BEGIN
    var_admin_id := (input_data->>'user_id')::UUID;
    var_item_id := (input_data->>'id')::UUID;
    var_package_name := input_data->>'package_name';
    var_registration_id := (input_data->>'registration_id')::UUID;
    var_locker_id := (input_data->>'locker_id')::UUID;
    var_package_type := input_data->>'package_type';
    var_status := input_data->>'status';
    var_package_photo := input_data->>'package_photo';
    var_locker_status := input_data->>'locker_status';

    -- 1. Fetch existing item data
    SELECT 
        mailbox_item_status, 
        mailroom_registration_id, 
        mailbox_item_name
    INTO 
        var_old_status, 
        var_old_registration_id, 
        var_old_item_name
    FROM mailbox_item_table
    WHERE mailbox_item_id = var_item_id;

    IF var_old_item_name IS NULL THEN
        RAISE EXCEPTION 'Package not found';
    END IF;

    -- 2. Update mailbox_item_table
    UPDATE mailbox_item_table
    SET
        mailbox_item_name = COALESCE(var_package_name, mailbox_item_name),
        mailroom_registration_id = COALESCE(var_registration_id, mailroom_registration_id),
        location_locker_id = CASE WHEN (input_data ? 'locker_id') THEN var_locker_id ELSE location_locker_id END,
        mailbox_item_type = COALESCE(var_package_type::mailroom_package_type, mailbox_item_type),
        mailbox_item_status = COALESCE(var_status::mailroom_package_status, mailbox_item_status),
        mailbox_item_photo = CASE WHEN (input_data ? 'package_photo') THEN var_package_photo ELSE mailbox_item_photo END,
        mailbox_item_updated_at = NOW()
    WHERE mailbox_item_id = var_item_id
    RETURNING TO_JSONB(mailbox_item_table.*) INTO var_updated_item;

    -- 3. Update locker status if provided
    IF var_locker_status IS NOT NULL AND var_old_registration_id IS NOT NULL THEN
        UPDATE mailroom_assigned_locker_table
        SET mailroom_assigned_locker_status = var_locker_status::mailroom_assigned_locker_status
        WHERE mailroom_registration_id = var_old_registration_id;
    END IF;

    -- 4. Construct return data with embedded files
    SELECT 
      var_updated_item || jsonb_build_object(
        'mailroom_file_table', (
          SELECT json_agg(row_to_json(mft))
          FROM public.mailroom_file_table mft
          WHERE mft.mailbox_item_id = var_item_id
        )
      ) INTO var_updated_item;

    var_return_data := JSONB_BUILD_OBJECT(
        'ok', TRUE,
        'item', var_updated_item,
        'old_status', var_old_status,
        'old_registration_id', var_old_registration_id,
        'old_item_name', var_old_item_name
    );

    RETURN var_return_data;
END;
$$;

-- Create RPC for admin to soft delete a mailbox item
CREATE OR REPLACE FUNCTION admin_delete_mailbox_item(input_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    var_admin_id UUID;
    var_item_id UUID;
    var_package_name TEXT;
    var_registration_id UUID;
    var_return_data JSONB;
BEGIN
    var_admin_id := (input_data->>'user_id')::UUID;
    var_item_id := (input_data->>'id')::UUID;

    -- 1. Fetch package details for logging
    SELECT 
        mailbox_item_name, 
        mailroom_registration_id
    INTO 
        var_package_name, 
        var_registration_id
    FROM mailbox_item_table
    WHERE mailbox_item_id = var_item_id;

    IF var_package_name IS NULL THEN
        RAISE EXCEPTION 'Package not found';
    END IF;

    -- 2. Soft delete: set deleted_at timestamp
    UPDATE mailbox_item_table
    SET mailbox_item_deleted_at = NOW()
    WHERE mailbox_item_id = var_item_id;

    -- 3. Construct return data
    var_return_data := JSONB_BUILD_OBJECT(
        'success', TRUE,
        'package_name', var_package_name,
        'registration_id', var_registration_id,
        'deleted_at', NOW()
    );

    RETURN var_return_data;
END;
$$;

-- Create RPC to mark all unread notifications as read for a specific user
CREATE OR REPLACE FUNCTION mark_notifications_as_read(input_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    var_return_data JSONB;
BEGIN
    UPDATE notification_table
    SET notification_is_read = TRUE
    WHERE user_id = input_user_id
      AND notification_is_read = FALSE;

    var_return_data := JSONB_BUILD_OBJECT('success', TRUE);
    RETURN var_return_data;
END;
$$;

-- Create RPC for generating a unique mailroom registration code
CREATE OR REPLACE FUNCTION generate_mailroom_registration_code()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    var_mailroom_code TEXT;
    var_is_unique BOOLEAN := FALSE;
    var_attempts INTEGER := 0;
    var_random_str TEXT;
    var_return_data JSONB;
BEGIN
    WHILE NOT var_is_unique AND var_attempts < 10 LOOP
        -- Generate 6 random hex characters
        var_random_str := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
        var_mailroom_code := 'KPH-' || var_random_str;

        -- Check if code exists
        IF NOT EXISTS (
            SELECT 1 
            FROM mailroom_registration_table 
            WHERE mailroom_registration_code = var_mailroom_code
        ) THEN
            var_is_unique := TRUE;
        END IF;

        var_attempts := var_attempts + 1;
    END LOOP;

    IF NOT var_is_unique THEN
        RAISE EXCEPTION 'Failed to generate unique mailroom code';
    END IF;

    var_return_data := JSONB_BUILD_OBJECT(
        'code', var_mailroom_code
    );

    RETURN var_return_data;
END;
$$;

-- RPC for getting assigned lockers for admin
CREATE OR REPLACE FUNCTION admin_get_assigned_lockers()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    var_return_data JSONB;
BEGIN
    SELECT JSONB_AGG(
        JSONB_BUILD_OBJECT(
            'id', malt.mailroom_assigned_locker_id,
            'registration_id', malt.mailroom_registration_id,
            'locker_id', malt.location_locker_id,
            'status', malt.mailroom_assigned_locker_status,
            'assigned_at', malt.mailroom_assigned_locker_assigned_at,
            'registration', JSONB_BUILD_OBJECT(
                'id', mrt.mailroom_registration_id,
                'user_id', mrt.user_id,
                'email', ut.users_email
            ),
            'locker', JSONB_BUILD_OBJECT(
                'id', llt.location_locker_id,
                'code', llt.location_locker_code,
                'is_available', llt.location_locker_is_available
            )
        )
    ) INTO var_return_data
    FROM mailroom_assigned_locker_table malt
    JOIN mailroom_registration_table mrt ON malt.mailroom_registration_id = mrt.mailroom_registration_id
    JOIN users_table ut ON mrt.user_id = ut.users_id
    JOIN location_locker_table llt ON malt.location_locker_id = llt.location_locker_id;

    RETURN COALESCE(var_return_data, '[]'::JSONB);
END;
$$;

-- RPC for creating an assigned locker for admin
CREATE OR REPLACE FUNCTION admin_create_assigned_locker(input_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    var_registration_id UUID;
    var_locker_id UUID;
    var_locker_available BOOLEAN;
    var_new_assignment_id UUID;
    var_return_data JSONB;
BEGIN
    var_registration_id := (input_data->>'registration_id')::UUID;
    var_locker_id := (input_data->>'locker_id')::UUID;

    -- 1. Check locker availability
    SELECT location_locker_is_available INTO var_locker_available
    FROM location_locker_table
    WHERE location_locker_id = var_locker_id
    FOR UPDATE; -- Lock the row for update

    IF var_locker_available IS NULL THEN
        RAISE EXCEPTION 'Locker not found';
    ELSIF var_locker_available = FALSE THEN
        RAISE EXCEPTION 'Locker is not available';
    END IF;

    -- 2. Create assignment
    INSERT INTO mailroom_assigned_locker_table (
        mailroom_registration_id,
        location_locker_id,
        mailroom_assigned_locker_status,
        mailroom_assigned_locker_assigned_at
    )
    VALUES (
        var_registration_id,
        var_locker_id,
        'Empty',
        NOW()
    )
    RETURNING mailroom_assigned_locker_id INTO var_new_assignment_id;

    -- 3. Mark locker unavailable
    UPDATE location_locker_table
    SET location_locker_is_available = FALSE
    WHERE location_locker_id = var_locker_id;

    -- 4. Return the new assignment with joined data
    SELECT JSONB_BUILD_OBJECT(
        'id', malt.mailroom_assigned_locker_id,
        'registration_id', malt.mailroom_registration_id,
        'locker_id', malt.location_locker_id,
        'status', malt.mailroom_assigned_locker_status,
        'assigned_at', malt.mailroom_assigned_locker_assigned_at,
        'locker', JSONB_BUILD_OBJECT(
            'location_locker_id', llt.location_locker_id,
            'location_locker_code', llt.location_locker_code
        ),
        'registration', JSONB_BUILD_OBJECT(
            'mailroom_registration_id', mrt.mailroom_registration_id,
            'user_id', mrt.user_id
        )
    ) INTO var_return_data
    FROM mailroom_assigned_locker_table malt
    JOIN location_locker_table llt ON malt.location_locker_id = llt.location_locker_id
    JOIN mailroom_registration_table mrt ON malt.mailroom_registration_id = mrt.mailroom_registration_id
    WHERE malt.mailroom_assigned_locker_id = var_new_assignment_id;

    RETURN var_return_data;
END;
$$;

-- RPC to fetch archived (soft-deleted) inventory records
CREATE OR REPLACE FUNCTION public.get_admin_archived_packages(
  input_limit INTEGER DEFAULT 50,
  input_offset INTEGER DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  result JSON;
  packages_json JSON;
  total_count INTEGER;
BEGIN
  -- Get total count of archived packages
  SELECT COUNT(*) INTO total_count
  FROM public.mailbox_item_table
  WHERE mailbox_item_deleted_at IS NOT NULL;

  -- Get archived packages with same structure as get_admin_mailroom_packages
  WITH archived_items AS (
    SELECT 
      mi.mailbox_item_id,
      mi.mailbox_item_name,
      mi.mailroom_registration_id,
      mi.location_locker_id,
      mi.mailbox_item_type,
      mi.mailbox_item_status,
      mi.mailbox_item_photo,
      mi.mailbox_item_received_at,
      mi.mailbox_item_created_at,
      mi.mailbox_item_updated_at,
      mi.mailbox_item_deleted_at,
      mr.mailroom_registration_id AS reg_id,
      mr.mailroom_registration_code,
      ll.location_locker_id AS locker_id,
      ll.location_locker_code,
      u.users_email,
      u.mobile_number,
      uk.user_kyc_first_name,
      uk.user_kyc_last_name,
      ml.mailroom_location_name,
      p.mailroom_plan_id,
      p.mailroom_plan_name,
      p.mailroom_plan_can_receive_mail,
      p.mailroom_plan_can_receive_parcels
    FROM public.mailbox_item_table mi
    LEFT JOIN public.mailroom_registration_table mr ON mr.mailroom_registration_id = mi.mailroom_registration_id
    LEFT JOIN public.location_locker_table ll ON ll.location_locker_id = mi.location_locker_id
    LEFT JOIN public.users_table u ON u.users_id = mr.user_id
    LEFT JOIN public.user_kyc_table uk ON uk.user_id = u.users_id
    LEFT JOIN public.mailroom_location_table ml ON ml.mailroom_location_id = mr.mailroom_location_id
    LEFT JOIN public.mailroom_plan_table p ON p.mailroom_plan_id = mr.mailroom_plan_id
    WHERE mi.mailbox_item_deleted_at IS NOT NULL
    ORDER BY mi.mailbox_item_deleted_at DESC
    LIMIT input_limit
    OFFSET input_offset
  )
  SELECT COALESCE(
    JSON_AGG(
      JSON_BUILD_OBJECT(
        'id', ai.mailbox_item_id,
        'package_name', ai.mailbox_item_name,
        'registration_id', ai.mailroom_registration_id,
        'locker_id', ai.location_locker_id,
        'package_type', ai.mailbox_item_type,
        'status', ai.mailbox_item_status,
        'package_photo', ai.mailbox_item_photo,
        'received_at', ai.mailbox_item_received_at,
        'mailbox_item_created_at', ai.mailbox_item_created_at,
        'mailbox_item_updated_at', ai.mailbox_item_updated_at,
        'deleted_at', ai.mailbox_item_deleted_at,
        'registration', CASE
          WHEN ai.reg_id IS NOT NULL THEN JSON_BUILD_OBJECT(
            'id', ai.reg_id,
            'full_name', COALESCE(
              CONCAT_WS(' ', ai.user_kyc_first_name, ai.user_kyc_last_name),
              ai.mailroom_location_name,
              'Unknown'
            ),
            'email', ai.users_email,
            'mobile', ai.mobile_number,
            'mailroom_code', ai.mailroom_registration_code,
            'mailroom_plans', CASE
              WHEN ai.mailroom_plan_id IS NOT NULL THEN JSON_BUILD_OBJECT(
                'name', ai.mailroom_plan_name,
                'can_receive_mail', ai.mailroom_plan_can_receive_mail,
                'can_receive_parcels', ai.mailroom_plan_can_receive_parcels
              )
              ELSE NULL
            END
          )
          ELSE NULL
        END,
        'locker', CASE
          WHEN ai.locker_id IS NOT NULL THEN JSON_BUILD_OBJECT(
            'id', ai.locker_id,
            'locker_code', ai.location_locker_code
          )
          ELSE NULL
        END
      )
    ),
    '[]'::JSON
  )
  INTO packages_json
  FROM archived_items ai;

  result := JSON_BUILD_OBJECT(
    'packages', packages_json,
    'total_count', total_count
  );

  RETURN result;
END;
$$;

-- RPC to restore archived package
CREATE OR REPLACE FUNCTION public.admin_restore_mailbox_item(input_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  var_item_id UUID;
  var_package_name TEXT;
  var_return_data JSONB;
BEGIN
  var_item_id := (input_data->>'id')::UUID;

  UPDATE public.mailbox_item_table
  SET mailbox_item_deleted_at = NULL,
      mailbox_item_updated_at = NOW()
  WHERE mailbox_item_id = var_item_id
  RETURNING mailbox_item_name INTO var_package_name;

  IF var_package_name IS NULL THEN
    RAISE EXCEPTION 'Package not found';
  END IF;

  var_return_data := JSONB_BUILD_OBJECT(
    'success', TRUE,
    'package_name', var_package_name,
    'restored_at', NOW()
  );

  RETURN var_return_data;
END;
$$;

-- Create DB-BACKUPS storage bucket for database backups
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'DB-BACKUPS'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('DB-BACKUPS', 'DB-BACKUPS', false);
  ELSE
    UPDATE storage.buckets 
    SET public = false 
    WHERE id = 'DB-BACKUPS';
  END IF;
END $$;

-- Policy: Only admins can access DB-BACKUPS bucket
DROP POLICY IF EXISTS db_backups_policy ON storage.objects;
CREATE POLICY db_backups_policy
ON storage.objects
FOR ALL
USING (
  bucket_id = 'DB-BACKUPS'
  AND EXISTS (
    SELECT 1 
    FROM public.users_table 
    WHERE users_id = auth.uid() 
    AND users_role = 'admin'
  )
);

CREATE OR REPLACE FUNCTION check_email_exists(p_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM users_table
        WHERE users_email = p_email
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 

CREATE OR REPLACE FUNCTION public.get_user_kyc_with_populated_user(input_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF input_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN (
    SELECT 
      to_jsonb(kyc.*) || 
      jsonb_build_object(
        'user', jsonb_build_object(
          'users_id', users.users_id,
          'users_email', users.users_email,
          'users_avatar_url', users.users_avatar_url
        )
      )
    FROM public.user_kyc_table AS kyc
    LEFT JOIN public.users_table AS users
      ON kyc.user_id = users.users_id
    WHERE kyc.user_id = input_user_id
    LIMIT 1
  );
END;
$$;

-- Create the RPC function to claim rewards
CREATE OR REPLACE FUNCTION public.claim_referral_rewards(
    input_user_id UUID,
    input_payment_method TEXT,
    input_account_details TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_referrals INT;
    v_claimed_milestones INT;
    v_eligible_milestones INT;
    v_claimable_count INT;
    v_reward_amount INT;
    v_new_milestone_count INT;
    v_result JSONB;
BEGIN
    -- Get current user stats
    -- Count from referral_table where this user is the referrer
    SELECT COUNT(*) INTO v_total_referrals
    FROM public.referral_table
    WHERE referral_referrer_user_id = input_user_id;

    -- Get already claimed milestones
    SELECT referral_reward_milestone_claimed INTO v_claimed_milestones
    FROM users_table
    WHERE users_id = input_user_id;

    -- Calculate eligibility
    v_eligible_milestones := FLOOR(v_total_referrals / 10);
    v_claimable_count := v_eligible_milestones - v_claimed_milestones;

    IF v_claimable_count <= 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'No rewards currently claimable',
            'payout', 0
        );
    END IF;

    v_reward_amount := v_claimable_count * 500;
    v_new_milestone_count := v_claimed_milestones + v_claimable_count;

    -- Update user table (atomic)
    UPDATE users_table
    SET referral_reward_milestone_claimed = v_new_milestone_count
    WHERE users_id = input_user_id;

    -- Insert into rewards_claim_table for history and audit
    INSERT INTO public.rewards_claim_table (
        user_id,
        rewards_claim_payment_method,
        rewards_claim_account_details,
        rewards_claim_amount,
        rewards_claim_status,
        rewards_claim_referral_count,
        rewards_claim_total_referrals
    ) VALUES (
        input_user_id,
        input_payment_method, -- Use actual payment method
        input_account_details, -- Use actual account details
        v_reward_amount,
        'PENDING', -- Set to PENDING so admin can process it
        v_claimable_count * 10, -- Referrals for this specific claim
        v_total_referrals -- Snapshot of total referrals at time of claim
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Rewards claimed successfully',
        'payout', v_reward_amount,
        'milestones_claimed', v_claimable_count,
        'total_claimed_milestones', v_new_milestone_count
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'message', SQLERRM,
        'payout', 0
    );
END;
$$;

-- Additional GRANT PERMISSIONS
GRANT EXECUTE ON FUNCTION get_user_storage_files(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_storage_file(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_registration_scans(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification(JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION admin_update_mailbox_item(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_mailbox_item(JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION admin_delete_mailbox_item(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_mailbox_item(JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION mark_notifications_as_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notifications_as_read(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION generate_mailroom_registration_code() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_mailroom_registration_code() TO service_role;
GRANT EXECUTE ON FUNCTION admin_get_assigned_lockers() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_assigned_lockers() TO service_role;
GRANT EXECUTE ON FUNCTION admin_create_assigned_locker(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_create_assigned_locker(JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_archived_packages(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_restore_mailbox_item(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_referral_rewards(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_kyc_with_populated_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_email_exists(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_email_exists(TEXT) TO anon;

-- Create a function to get user notifications
CREATE OR REPLACE FUNCTION get_user_notifications(input_user_id UUID, input_limit INT DEFAULT 10)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    return_data JSONB;
BEGIN
    SELECT 
        jsonb_agg(notification_table)
    INTO 
        return_data
    FROM (
        SELECT 
            notification_table.*
        FROM notification_table
        WHERE user_id = input_user_id
        ORDER BY notification_created_at DESC
        LIMIT input_limit
    ) AS notification_table;

    RETURN COALESCE(return_data, '[]'::JSONB);
END;
$$;

-- Create a function to list all mailroom plans
CREATE OR REPLACE FUNCTION get_mailroom_plans()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    return_data JSONB;
BEGIN
    SELECT 
        jsonb_agg(mailroom_plan_table)
    INTO 
        return_data
    FROM (
        SELECT 
            mailroom_plan_id,
            mailroom_plan_name,
            mailroom_plan_price,
            mailroom_plan_description,
            mailroom_plan_storage_limit,
            mailroom_plan_can_receive_mail,
            mailroom_plan_can_receive_parcels,
            mailroom_plan_can_digitize
        FROM mailroom_plan_table
        ORDER BY mailroom_plan_price ASC
    ) AS mailroom_plan_table;

    RETURN COALESCE(return_data, '[]'::JSONB);
END;
$$;

-- Additional GRANT PERMISSIONS
GRANT EXECUTE ON FUNCTION get_user_notifications(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_mailroom_plans() TO authenticated;
GRANT EXECUTE ON FUNCTION get_mailroom_plans() TO anon;
