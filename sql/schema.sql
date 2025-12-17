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


-- Users
CREATE TABLE users_table (
    users_id UUID NOT NULL DEFAULT gen_random_uuid(),
    users_email TEXT NOT NULL UNIQUE,
    -- users_password TEXT,
    -- users_first_name TEXT NOT NULL,
    -- users_last_name TEXT NOT NULL,
    users_role TEXT NOT NULL DEFAULT 'user',
    users_created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    users_avatar_url TEXT,
    users_is_verified BOOLEAN DEFAULT false,
    users_referral_code TEXT,
    mobile_number TEXT,
    CONSTRAINT users_table_pkey PRIMARY KEY (users_id)
);

-- billing cutoff

-- cashout needs KYC verification
-- KYC verification first before mail services
-- User KYC (one-to-one with Users)
-- address is required (segmented)
-- dob
-- agreements
-- rejected reasons
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
    -- user_kyc_full_name TEXT,
    user_kyc_first_name TEXT,
    user_kyc_last_name TEXT,
    -- user_kyc_address JSONB, -- remove
    CONSTRAINT user_kyc_table_pkey PRIMARY KEY (user_kyc_id)
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
-- 

-- payment subscription_table
-- billing cycle (monthly, quarterly, annual) -- ENUM('MONTHLY', 'QUARTERLY', 'ANNUAL')
-- mailroom_registration_auto_renew BOOLEAN DEFAULT true, -- true: auto-renew, false: manual
-- started_at
-- expires_at

-- payment_transaction_table   
-- payment_id
-- payment_amount
-- payment_status
-- payment_date
-- payment_method
-- payment_type
-- payment_reference_id
-- payment_channel - paymongo
-- payment_reference
-- payment_created_at
-- mailroom_registration_order_id



-- details of lockers
--
CREATE TABLE mailroom_registration_table (
    mailroom_registration_id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users_table(users_id),
    -- mailroom_location_id UUID NOT NULL REFERENCES mailroom_location_table(mailroom_location_id),
    mailroom_plan_id UUID NOT NULL REFERENCES mailroom_plan_table(mailroom_plan_id),
    payment_transaction_table
    subscription_table
    -- mailroom_registration_locker_qty INTEGER NOT NULL, -- remove
    -- mailroom_registration_months INTEGER NOT NULL, billing cycle (monthly, quarterly, annual)
    -- mailroom_registration_notes TEXT, --remove
    -- mailroom_registration_created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    -- mailroom_registration_full_name TEXT NOT NULL,
    -- mailroom_registration_email TEXT NOT NULL,
    -- mailroom_registration_mobile TEXT NOT NULL,
    -- mailroom_registration_status BOOLEAN DEFAULT true, ---
    -- mailroom_registration_code TEXT UNIQUE, -- mailroom code
 
    -- mailroom_registration_order_id TEXT UNIQUE, -- order id
    -- mailroom_registration_paid BOOLEAN DEFAULT false, -- true: paid, false: unpaid
    -- mailroom_registration_paymongo_payment_id TEXT, -- paymongo payment id
    -- CONSTRAINT mailroom_registration_table_pkey PRIMARY KEY (mailroom_registration_id)
    --
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
-- social media (whatsapp, viber, telegram, etc.) - add this to the table
-- mailbox_item_receiver
CREATE TABLE mailbox_item_table (
    mailbox_item_id UUID NOT NULL DEFAULT gen_random_uuid(),
    mailroom_registration_id UUID NOT NULL REFERENCES mailroom_registration_table(mailroom_registration_id),
    mailbox_item_type mailbox_item_type NOT NULL, -- ENUM('Document', 'Parcel')
    mailbox_item_status mailbox_item_status NOT NULL DEFAULT 'STORED', -- ENUM('STORED', 'RELEASED', 'RETRIEVED', 'DISPOSED', 'REQUEST_TO_RELEASE', 'REQUEST_TO_DISPOSE', 'REQUEST_TO_SCAN')
mailroom_scan_table
    mailbox_item_received_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    location_locker_id UUID,
    mailbox_item_release_proof_url TEXT,
    mailbox_item_release_to_name TEXT,
    mailbox_item_release_address TEXT,
    user_address_id UUID,
    mailbox_item_name TEXT,
    mailbox_item_photo TEXT,
    CONSTRAINT mailbox_item_table_pkey PRIMARY KEY (mailroom_package_id)
);


CREATE TABLE mailroom_scan_table (
    mailroom_scan_id UUID NOT NULL DEFAULT gen_random_uuid(),
    mailbox_item_id UUID NOT NULL REFERENCES mailbox_item_table(mailbox_item_id),
    mailroom_scan_file_name TEXT NOT NULL,
    mailroom_scan_file_url TEXT NOT NULL,
    mailroom_scan_file_size_mb NUMERIC NOT NULL DEFAULT 0,
    mailroom_scan_mime_type TEXT,
    mailroom_scan_uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT mailroom_scan_table_pkey PRIMARY KEY (mailroom_scan_id)
);



-- Mailroom Scans (one-to-many with Mailroom Packages)
CREATE TABLE mailroom_scan_table (
    mailroom_scan_id UUID NOT NULL DEFAULT gen_random_uuid(),
    mailroom_package_id UUID NOT NULL REFERENCES mailroom_package_table(mailroom_package_id),
    mailroom_scan_file_name TEXT NOT NULL,
    mailroom_scan_file_url TEXT NOT NULL,
    mailroom_scan_file_size_mb NUMERIC NOT NULL DEFAULT 0,
    mailroom_scan_mime_type TEXT,
    mailroom_scan_uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT mailroom_scan_table_pkey PRIMARY KEY (mailroom_scan_id)
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

-- Paymongo Payments (standalone)
CREATE TABLE paymongo_payment_table (
    paymongo_payment_id TEXT NOT NULL,
    paymongo_payment_source_id TEXT,
    paymongo_payment_order_id TEXT,
    paymongo_payment_status TEXT,
    paymongo_payment_amount INTEGER,
    paymongo_payment_currency TEXT,
    paymongo_payment_raw JSONB,
    paymongo_payment_created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    paymongo_payment_updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT paymongo_payment_table_pkey PRIMARY KEY (paymongo_payment_id)
);

-- Referrals (one-to-many with Users)
CREATE TABLE referral_table (
    referral_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users_table(users_id),
    referral_referred_email TEXT,
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
CREATE INDEX idx_mailroom_registration_paid ON mailroom_registration_table(mailroom_registration_paid);
