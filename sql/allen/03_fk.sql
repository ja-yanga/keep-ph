-- ========================================
-- FOREIGN KEY CONSTRAINTS (with presentation comments)
-- Added separately to avoid circular dependencies
-- ========================================

-- Address belongs to a user
ALTER TABLE public.address_table
  ADD CONSTRAINT fk_address_user FOREIGN KEY (user_table_id)
  REFERENCES public.user_table(user_table_id); -- previously: user_addresses.user_id → user_table.user_table_id

-- KYC belongs to a user
ALTER TABLE public.kyc_table
  ADD CONSTRAINT fk_kyc_user FOREIGN KEY (user_table_id)
  REFERENCES public.user_table(user_table_id); -- previously: user_kyc.user_id → user_table.user_table_id

-- Notification belongs to a user
ALTER TABLE public.notification_table
  ADD CONSTRAINT fk_notification_user FOREIGN KEY (user_table_id)
  REFERENCES public.user_table(user_table_id); -- previously: notifications.user_id → user_table.user_table_id

-- Referral belongs to a user
ALTER TABLE public.referral_table 
  ADD CONSTRAINT fk_referral_user FOREIGN KEY (user_table_id)
  REFERENCES public.user_table(user_table_id); -- previously: referrals_table.referrals_user_id → user_table.user_table_id

-- Reward claim belongs to a user
ALTER TABLE public.reward_claim_table
  ADD CONSTRAINT fk_reward_user FOREIGN KEY (user_table_id)
  REFERENCES public.user_table(user_table_id); -- previously: rewards_claims.user_id → user_table.user_table_id

-- Registration belongs to a user
ALTER TABLE public.registration_table
  ADD CONSTRAINT fk_registration_user FOREIGN KEY (user_table_id)
  REFERENCES public.user_table(user_table_id); -- previously: mailroom_registrations.user_id → user_table.user_table_id

-- Registration belongs to a location
ALTER TABLE public.registration_table
  ADD CONSTRAINT fk_registration_location FOREIGN KEY (location_table_id)
  REFERENCES public.location_table(location_table_id); -- previously: mailroom_registrations.location_id → location_table.location_table_id

-- Registration belongs to a plan
ALTER TABLE public.registration_table
  ADD CONSTRAINT fk_registration_plan FOREIGN KEY (plan_table_id)
  REFERENCES public.plan_table(plan_table_id); -- previously: mailroom_registrations.plan_id → plan_table.plan_table_id

-- Registration may have a payment
ALTER TABLE public.registration_table
  ADD CONSTRAINT fk_registration_payment FOREIGN KEY (payment_id)
  REFERENCES public.paymongo_payments_table(paymongo_payments_table_id); -- previously: mailroom_registrations.paymongo_payment_id → paymongo_payments_table.paymongo_payments_table_id

-- Locker belongs to a location
ALTER TABLE public.locker_table
  ADD CONSTRAINT fk_locker_location FOREIGN KEY (location_table_id)
  REFERENCES public.location_table(location_table_id); -- previously: location_lockers.location_id → location_table.location_table_id

-- Assignment belongs to a registration
ALTER TABLE public.assignment_table
  ADD CONSTRAINT fk_assignment_registration FOREIGN KEY (registration_table_id)
  REFERENCES public.registration_table(registration_table_id); -- previously: mailroom_assigned_lockers.registration_id → registration_table.registration_table_id

-- Assignment belongs to a locker
ALTER TABLE public.assignment_table
  ADD CONSTRAINT fk_assignment_locker FOREIGN KEY (locker_table_id)
  REFERENCES public.locker_table(locker_table_id); -- previously: mailroom_assigned_lockers.locker_id → locker_table.locker_table_id

-- Package belongs to a registration
ALTER TABLE public.package_table
  ADD CONSTRAINT fk_package_registration FOREIGN KEY (registration_table_id)
  REFERENCES public.registration_table(registration_table_id); -- previously: mailroom_packages.registration_id → registration_table.registration_table_id

-- Package may belong to a locker
ALTER TABLE public.package_table
  ADD CONSTRAINT fk_package_locker FOREIGN KEY (locker_table_id)
  REFERENCES public.locker_table(locker_table_id); -- previously: mailroom_packages.locker_id → locker_table.locker_table_id

-- Package may have a release address
ALTER TABLE public.package_table
  ADD CONSTRAINT fk_package_release_address FOREIGN KEY (release_address_table_id)
  REFERENCES public.address_table(address_table_id); -- previously: mailroom_packages.release_address_id → address_table.address_table_id

-- Scan belongs to a package
ALTER TABLE public.scan_table
  ADD CONSTRAINT fk_scan_package FOREIGN KEY (package_table_id)
  REFERENCES public.package_table(package_table_id); -- previously: mailroom_scans.package_id → package_table.package_table_id
