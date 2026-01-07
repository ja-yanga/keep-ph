-- Remove all policies for files
DROP POLICY IF EXISTS objects_policy ON storage.objects;
DROP POLICY IF EXISTS buckets_policy ON storage.buckets;

-- Delete file buckets created and files uploaded
DELETE FROM storage.objects;
DELETE FROM storage.buckets;

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('USER-KYC-DOCUMENTS', 'USER-KYC-DOCUMENTS', true),
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
  CONSTRAINT users_table_pkey PRIMARY KEY (users_id)
);

CREATE TABLE user_kyc_table (
  user_kyc_id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users_table(users_id),
  user_kyc_status user_kyc_status NOT NULL DEFAULT 'SUBMITTED',
  user_kyc_id_front_url TEXT NOT NULL,
  user_kyc_id_back_url TEXT NOT NULL,
  user_kyc_id_number VARCHAR(64),
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
CREATE INDEX IF NOT EXISTS idx_user_kyc_id_number ON user_kyc_table(user_kyc_id_number);

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

