-- ========================================
-- ENUM DEFINITIONS
-- ========================================
-- Previously: all string types for roles, status, types
-- Now: using ENUMs for better type safety and consistency

-- User roles
CREATE TYPE public.user_role AS ENUM ('ADMIN', 'USER');

-- KYC status
CREATE TYPE public.kyc_status AS ENUM ('PROCESSING', 'APPROVED', 'REJECTED');

-- Package type (was previously TEXT)
CREATE TYPE public.package_type AS ENUM ('DOCUMENT', 'PARCEL');

-- Package status (was previously TEXT with CHECK)
CREATE TYPE public.package_status AS ENUM (
  'STORED', 'RELEASED', 'RETRIEVED', 'DISPOSED', 
  'REQUEST_TO_RELEASE', 'REQUEST_TO_DISPOSE', 'REQUEST_TO_SCAN'
);

-- Locker assignment status
CREATE TYPE public.assignment_status AS ENUM ('EMPTY', 'NORMAL', 'NEAR_FULL', 'FULL');

-- Notification type
CREATE TYPE public.notification_type AS ENUM (
  'PACKAGE_ARRIVED', 'PACKAGE_RELEASED', 'PACKAGE_DISPOSED', 
  'SCAN_READY', 'SYSTEM', 'REWARD_PROCESSING', 'REWARD_PAID'
);

-- Reward claim status
CREATE TYPE public.reward_status AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'REJECTED');
