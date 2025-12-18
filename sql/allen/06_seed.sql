-- Minimal test data (run after enums, schema, fks, indexes, rls)

-- Users
INSERT INTO public.user_table (user_table_id, email, password, first_name, last_name, role, referral_code, created_at) VALUES
  ('11111111-1111-1111-1111-111111111111','admin@example.com','$2b$10$examplehashedadminpw','Admin','Admin','ADMIN',NULL,NOW()),
  ('22222222-2222-2222-2222-222222222222','user@example.com','$2b$10$examplehasheduserpw','Jane','Doe','USER','REF-USER-1',NOW());

-- Plans
INSERT INTO public.plan_table (plan_table_id, name, price, description, storage_limit) VALUES
  ('33333333-3333-3333-3333-333333333333','Basic',199.00,'Basic plan',10),
  ('44444444-4444-4444-4444-444444444444','Pro',499.00,'Pro plan',50);

-- Location + lockers
INSERT INTO public.location_table (location_table_id, name, region, city, barangay, zip, code, total_lockers) VALUES
  ('55555555-5555-5555-5555-555555555555','Main Hub','NCR','Manila','Barangay 1','1000','MHUB',10);

INSERT INTO public.locker_table (locker_table_id, location_table_id, locker_code, is_available, created_at) VALUES
  ('66666666-6666-6666-6666-666666666666','55555555-5555-5555-5555-555555555555','A01',TRUE,NOW()),
  ('66666666-6666-6666-6666-666666666667','55555555-5555-5555-5555-555555555555','A02',TRUE,NOW());

-- Address for user
INSERT INTO public.address_table (address_table_id, user_table_id, label, line1, city, region, postal, contact_name, is_default, created_at) VALUES
  ('77777777-7777-7777-7777-777777777777','22222222-2222-2222-2222-222222222222','Home','123 Main St','Manila','NCR','1000','Jane Doe',TRUE,NOW());

-- KYC submission (owned by user)
INSERT INTO public.kyc_table (kyc_table_id, user_table_id, status, id_front_url, id_back_url, id_document_type, first_name, last_name, address_line1, address_city, address_region, address_postal, submitted_at, created_at, updated_at) VALUES
  ('88888888-8888-8888-8888-888888888888','22222222-2222-2222-2222-222222222222','PROCESSING','https://example.com/id_front.jpg','https://example.com/id_back.jpg','GOV_ID','Jane','Doe','123 Main St','Manila','NCR','1000',NOW(),NOW(),NOW());

-- Payment (external)
INSERT INTO public.paymongo_payments_table (paymongo_payments_table_id, user_table_id, source_id, order_id, status, amount, currency, raw, created_at) VALUES
  ('pay_1','22222222-2222-2222-2222-222222222222','src_123','ord_123','paid',19900,'PHP','{}',NOW());

-- Registration
INSERT INTO public.registration_table (registration_table_id, user_table_id, location_table_id, plan_table_id, locker_qty, months, full_name, email, mobile, mailroom_code, auto_renew, order_id, payment_id, created_at) VALUES
  ('99999999-9999-9999-9999-999999999999','22222222-2222-2222-2222-222222222222','55555555-5555-5555-5555-555555555555','33333333-3333-3333-3333-333333333333',1,6,'Jane Doe','user@example.com','09171234567','MM-0001',TRUE,'ord_123','pay_1',NOW());

-- Assignment (assign locker to registration)
INSERT INTO public.assignment_table (assignment_table_id, registration_table_id, locker_table_id, status, assigned_at) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','99999999-9999-9999-9999-999999999999','66666666-6666-6666-6666-666666666666','NORMAL',NOW());

-- Package stored in locker
INSERT INTO public.package_table (package_table_id, registration_table_id, locker_table_id, package_type, status, package_name, received_at, release_to_name, release_address_table_id, release_proof_url) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','99999999-9999-9999-9999-999999999999','66666666-6666-6666-6666-666666666666','PARCEL','STORED','Parcel #1',NOW(),'Jane Doe','77777777-7777-7777-7777-777777777777',NULL);

-- Scan (file proof)
INSERT INTO public.scan_table (scan_table_id, package_table_id, file_name, file_url, file_size_mb, mime_type, uploaded_at) VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','scan1.jpg','https://example.com/scan1.jpg',0.2,'image/jpeg',NOW());

-- Notification
INSERT INTO public.notification_table (notification_table_id, user_table_id, title, message, type, link, is_read, created_at) VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddddddd','22222222-2222-2222-2222-222222222222','Welcome','Welcome to Keep','SYSTEM',NULL,FALSE,NOW());

-- Referral & reward claim
INSERT INTO public.referral_table (referral_table_id, user_table_id, referred_email, service_type, created_at) VALUES
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee','22222222-2222-2222-2222-222222222222','friend@example.com','registration',NOW());

INSERT INTO public.reward_claim_table (reward_claim_table_id, user_table_id, payment_method, account_details, amount, referral_count, status, proof_path, created_at) VALUES
  ('ffffffff-ffff-ffff-ffff-ffffffffffff','22222222-2222-2222-2222-222222222222','Bank','Acct 1234',500.00,1,'PENDING',NULL,NOW());