-- PRIMARY KEYS
ALTER TABLE public.location_lockers
  ADD CONSTRAINT location_lockers_pkey PRIMARY KEY (id);

ALTER TABLE public.mailroom_assigned_lockers
  ADD CONSTRAINT mailroom_assigned_lockers_pkey PRIMARY KEY (id);

ALTER TABLE public.mailroom_locations
  ADD CONSTRAINT mailroom_locations_pkey PRIMARY KEY (id);

ALTER TABLE public.mailroom_packages
  ADD CONSTRAINT mailroom_packages_pkey PRIMARY KEY (id);

ALTER TABLE public.mailroom_plans
  ADD CONSTRAINT mailroom_plans_pkey PRIMARY KEY (id);

ALTER TABLE public.mailroom_registrations
  ADD CONSTRAINT mailroom_registrations_pkey PRIMARY KEY (id);

ALTER TABLE public.mailroom_scans
  ADD CONSTRAINT mailroom_scans_pkey PRIMARY KEY (id);

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);

ALTER TABLE public.paymongo_payments
  ADD CONSTRAINT paymongo_payments_pkey PRIMARY KEY (id);

ALTER TABLE public.referrals_table
  ADD CONSTRAINT referrals_table_pkey PRIMARY KEY (referrals_id);

ALTER TABLE public.rewards_claims
  ADD CONSTRAINT rewards_claims_pkey PRIMARY KEY (id);

ALTER TABLE public.user_addresses
  ADD CONSTRAINT user_addresses_pkey PRIMARY KEY (id);

ALTER TABLE public.user_kyc
  ADD CONSTRAINT user_kyc_pkey PRIMARY KEY (id);

ALTER TABLE public.users
  ADD CONSTRAINT users_pkey PRIMARY KEY (id);

-- UNIQUE CONSTRAINTS
ALTER TABLE public.users
  ADD CONSTRAINT users_email_key UNIQUE (email);

ALTER TABLE public.mailroom_registrations
  ADD CONSTRAINT mailroom_registrations_mailroom_code_key UNIQUE (mailroom_code);

ALTER TABLE public.mailroom_registrations
  ADD CONSTRAINT mailroom_registrations_order_id_key UNIQUE (order_id);

ALTER TABLE public.mailroom_assigned_lockers
  ADD CONSTRAINT mailroom_assigned_lockers_locker_id_key UNIQUE (locker_id);

ALTER TABLE public.user_kyc
  ADD CONSTRAINT user_kyc_user_id_key UNIQUE (user_id);

-- CHECK CONSTRAINTS
ALTER TABLE public.mailroom_assigned_lockers
  ADD CONSTRAINT mailroom_assigned_lockers_status_check 
  CHECK (status IN ('Empty','Normal','Near Full','Full'));

ALTER TABLE public.mailroom_packages
  ADD CONSTRAINT mailroom_packages_package_type_check
  CHECK (package_type IN ('Document','Parcel'));

ALTER TABLE public.mailroom_packages
  ADD CONSTRAINT mailroom_packages_status_check
  CHECK (status IN ('STORED','RELEASED','RETRIEVED','DISPOSED','REQUEST_TO_RELEASE','REQUEST_TO_DISPOSE','REQUEST_TO_SCAN'));

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('PACKAGE_ARRIVED','PACKAGE_RELEASED','PACKAGE_DISPOSED','SCAN_READY','SYSTEM','REWARD_PROCESSING','REWARD_PAID'));

ALTER TABLE public.rewards_claims
  ADD CONSTRAINT rewards_claims_status_check
  CHECK (status IN ('PENDING','PROCESSING','PAID','REJECTED'));

-- FOREIGN KEYS
ALTER TABLE public.location_lockers
  ADD CONSTRAINT location_lockers_location_id_fkey
  FOREIGN KEY (location_id) REFERENCES public.mailroom_locations(id); -- FK → mailroom_locations(id)

ALTER TABLE public.mailroom_assigned_lockers
  ADD CONSTRAINT mailroom_assigned_lockers_registration_id_fkey
  FOREIGN KEY (registration_id) REFERENCES public.mailroom_registrations(id); -- FK → mailroom_registrations(id)

ALTER TABLE public.mailroom_assigned_lockers
  ADD CONSTRAINT mailroom_assigned_lockers_locker_id_fkey
  FOREIGN KEY (locker_id) REFERENCES public.location_lockers(id); -- FK → location_lockers(id)

ALTER TABLE public.mailroom_packages
  ADD CONSTRAINT mailroom_packages_registration_id_fkey
  FOREIGN KEY (registration_id) REFERENCES public.mailroom_registrations(id); -- FK → mailroom_registrations(id)

ALTER TABLE public.mailroom_packages
  ADD CONSTRAINT mailroom_packages_locker_id_fkey
  FOREIGN KEY (locker_id) REFERENCES public.location_lockers(id); -- FK → location_lockers(id)

ALTER TABLE public.mailroom_registrations
  ADD CONSTRAINT mailroom_registrations_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id); -- FK → users(id)

ALTER TABLE public.mailroom_registrations
  ADD CONSTRAINT mailroom_registrations_location_id_fkey
  FOREIGN KEY (location_id) REFERENCES public.mailroom_locations(id); -- FK → mailroom_locations(id)

ALTER TABLE public.mailroom_registrations
  ADD CONSTRAINT mailroom_registrations_plan_id_fkey
  FOREIGN KEY (plan_id) REFERENCES public.mailroom_plans(id); -- FK → mailroom_plans(id)

ALTER TABLE public.mailroom_scans
  ADD CONSTRAINT mailroom_scans_package_id_fkey
  FOREIGN KEY (package_id) REFERENCES public.mailroom_packages(id); -- FK → mailroom_packages(id)

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id); -- FK → users(id)

ALTER TABLE public.referrals_table
  ADD CONSTRAINT referrals_table_referrals_user_id_fkey
  FOREIGN KEY (referrals_user_id) REFERENCES public.users(id); -- FK → users(id)

ALTER TABLE public.rewards_claims
  ADD CONSTRAINT rewards_claims_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id); -- FK → users(id)

ALTER TABLE public.user_addresses
  ADD CONSTRAINT user_addresses_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id); -- FK → users(id)

ALTER TABLE public.user_kyc
  ADD CONSTRAINT user_kyc_user_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id); -- FK → users(id)

-- Automatically grant privileges for any future tables in the schema
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO public;

-- Automatically grant privileges for any future sequences in the schema
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO public;

-- Automatically grant privileges for any future functions in the schema
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO public;
