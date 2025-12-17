-- Enable RLS and add policies using Supabase auth (auth.uid() and jwt.claims.role).

-- USER TABLE RLS
ALTER TABLE public.user_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_table_self_select
  ON public.user_table FOR SELECT
  USING ( user_table_id = auth.uid() );

CREATE POLICY user_table_self_update
  ON public.user_table FOR UPDATE
  USING ( user_table_id = auth.uid() )
  WITH CHECK ( user_table_id = auth.uid() );

CREATE POLICY user_table_self_delete
  ON public.user_table FOR DELETE
  USING ( user_table_id = auth.uid() );

CREATE POLICY user_table_admin
  ON public.user_table FOR ALL
  USING ( current_setting('jwt.claims.role', true) = 'ADMIN' )
  WITH CHECK ( current_setting('jwt.claims.role', true) = 'ADMIN' );

-- KYC TABLE RLS (owners can INSERT/SELECT their submissions; admins have full access)
ALTER TABLE public.kyc_table ENABLE ROW LEVEL SECURITY;

-- allow owners to SELECT their KYC
CREATE POLICY kyc_select_owner
  ON public.kyc_table FOR SELECT
  USING ( user_table_id = auth.uid() );

-- allow owners to INSERT their KYC (enforce user_table_id = auth.uid())
CREATE POLICY kyc_insert_owner
  ON public.kyc_table FOR INSERT
  WITH CHECK ( user_table_id = auth.uid() );

-- allow admins full access
CREATE POLICY kyc_admin
  ON public.kyc_table FOR ALL
  USING ( current_setting('jwt.claims.role', true) = 'ADMIN' )
  WITH CHECK ( current_setting('jwt.claims.role', true) = 'ADMIN' );

-- PAYMENTS TABLE RLS (owner + admin)
ALTER TABLE public.paymongo_payments_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY payments_owner_or_admin
  ON public.paymongo_payments_table FOR ALL
  USING (
    user_table_id = auth.uid()
    OR current_setting('jwt.claims.role', true) = 'ADMIN'
  )
  WITH CHECK (
    user_table_id = auth.uid()
    OR current_setting('jwt.claims.role', true) = 'ADMIN'
  );

-- ADDRESS TABLE
ALTER TABLE public.address_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY address_select_owner
  ON public.address_table FOR SELECT
  USING ( user_table_id = auth.uid() OR current_setting('jwt.claims.role', true) = 'ADMIN' );

CREATE POLICY address_insert_owner
  ON public.address_table FOR INSERT
  WITH CHECK ( user_table_id = auth.uid() );

CREATE POLICY address_update_owner
  ON public.address_table FOR UPDATE
  USING ( user_table_id = auth.uid() OR current_setting('jwt.claims.role', true) = 'ADMIN' )
  WITH CHECK ( user_table_id = auth.uid() OR current_setting('jwt.claims.role', true) = 'ADMIN' );

CREATE POLICY address_delete_owner
  ON public.address_table FOR DELETE
  USING ( user_table_id = auth.uid() OR current_setting('jwt.claims.role', true) = 'ADMIN' );

-- REGISTRATION TABLE (user can read/add their own)
ALTER TABLE public.registration_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY registration_select_owner
  ON public.registration_table FOR SELECT
  USING ( user_table_id = auth.uid() OR current_setting('jwt.claims.role', true) = 'ADMIN' );

CREATE POLICY registration_insert_owner
  ON public.registration_table FOR INSERT
  WITH CHECK ( user_table_id = auth.uid() );

CREATE POLICY registration_update_owner
  ON public.registration_table FOR UPDATE
  USING ( user_table_id = auth.uid() OR current_setting('jwt.claims.role', true) = 'ADMIN' )
  WITH CHECK ( user_table_id = auth.uid() OR current_setting('jwt.claims.role', true) = 'ADMIN' );

-- PACKAGE TABLE (user can read/update their own via registration)
ALTER TABLE public.package_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY package_select_owner
  ON public.package_table FOR SELECT
  USING (
    current_setting('jwt.claims.role', true) = 'ADMIN'
    OR EXISTS (
      SELECT 1 FROM public.registration_table r
      WHERE r.registration_table_id = package_table.registration_table_id
        AND r.user_table_id = auth.uid()
    )
  );

CREATE POLICY package_update_owner
  ON public.package_table FOR UPDATE
  USING (
    current_setting('jwt.claims.role', true) = 'ADMIN'
    OR EXISTS (
      SELECT 1 FROM public.registration_table r
      WHERE r.registration_table_id = package_table.registration_table_id
        AND r.user_table_id = auth.uid()
    )
  )
  WITH CHECK (
    current_setting('jwt.claims.role', true) = 'ADMIN'
    OR EXISTS (
      SELECT 1 FROM public.registration_table r2
      WHERE r2.registration_table_id = package_table.registration_table_id
        AND r2.user_table_id = auth.uid()
    )
  );

-- SCAN TABLE (user can read/delete their own via package -> registration)
ALTER TABLE public.scan_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY scan_select_owner
  ON public.scan_table FOR SELECT
  USING (
    current_setting('jwt.claims.role', true) = 'ADMIN'
    OR EXISTS (
      SELECT 1 FROM public.package_table p
      JOIN public.registration_table r ON r.registration_table_id = p.registration_table_id
      WHERE p.package_table_id = scan_table.package_table_id
        AND r.user_table_id = auth.uid()
    )
  );

CREATE POLICY scan_delete_owner
  ON public.scan_table FOR DELETE
  USING (
    current_setting('jwt.claims.role', true) = 'ADMIN'
    OR EXISTS (
      SELECT 1 FROM public.package_table p
      JOIN public.registration_table r ON r.registration_table_id = p.registration_table_id
      WHERE p.package_table_id = scan_table.package_table_id
        AND r.user_table_id = auth.uid()
    )
  );

-- NOTIFICATION TABLE (user can read/update/delete their own)
ALTER TABLE public.notification_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_select_owner
  ON public.notification_table FOR SELECT
  USING ( user_table_id = auth.uid() OR current_setting('jwt.claims.role', true) = 'ADMIN' );

CREATE POLICY notification_update_owner
  ON public.notification_table FOR UPDATE
  USING ( user_table_id = auth.uid() OR current_setting('jwt.claims.role', true) = 'ADMIN' )
  WITH CHECK ( user_table_id = auth.uid() OR current_setting('jwt.claims.role', true) = 'ADMIN' );

CREATE POLICY notification_delete_owner
  ON public.notification_table FOR DELETE
  USING ( user_table_id = auth.uid() OR current_setting('jwt.claims.role', true) = 'ADMIN' );

-- REWARD CLAIM TABLE (user can create & read own)
ALTER TABLE public.reward_claim_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY reward_select_owner
  ON public.reward_claim_table FOR SELECT
  USING ( user_table_id = auth.uid() OR current_setting('jwt.claims.role', true) = 'ADMIN' );

CREATE POLICY reward_insert_owner
  ON public.reward_claim_table FOR INSERT
  WITH CHECK ( user_table_id = auth.uid() );

-- REFERRAL TABLE (user can create & read own)
ALTER TABLE public.referral_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY referral_select_owner
  ON public.referral_table FOR SELECT
  USING ( user_table_id = auth.uid() OR current_setting('jwt.claims.role', true) = 'ADMIN' );

CREATE POLICY referral_insert_owner
  ON public.referral_table FOR INSERT
  WITH CHECK ( user_table_id = auth.uid() );

-- ASSIGNMENT TABLE (user can read own via registration)
ALTER TABLE public.assignment_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY assignment_select_owner
  ON public.assignment_table FOR SELECT
  USING (
    current_setting('jwt.claims.role', true) = 'ADMIN'
    OR EXISTS (
      SELECT 1 FROM public.registration_table r
      WHERE r.registration_table_id = assignment_table.registration_table_id
        AND r.user_table_id = auth.uid()
    )
  );

-- LOCATION + LOCKER (users can view only)
ALTER TABLE public.location_table ENABLE ROW LEVEL SECURITY;
CREATE POLICY location_select_public
  ON public.location_table FOR SELECT
  USING ( true );

ALTER TABLE public.locker_table ENABLE ROW LEVEL SECURITY;
CREATE POLICY locker_select_public
  ON public.locker_table FOR SELECT
  USING ( true );

-- PLAN TABLE (users can view only)
ALTER TABLE public.plan_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY plan_select_public
  ON public.plan_table FOR SELECT
  USING ( true );

CREATE POLICY plan_admin ON public.plan_table FOR ALL
  USING ( current_setting('jwt.claims.role', true) = 'ADMIN' )
  WITH CHECK ( current_setting('jwt.claims.role', true) = 'ADMIN' );

-- Admin override policies for tables without explicit admin checks above
CREATE POLICY address_admin ON public.address_table FOR ALL
  USING ( current_setting('jwt.claims.role', true) = 'ADMIN' )
  WITH CHECK ( current_setting('jwt.claims.role', true) = 'ADMIN' );

CREATE POLICY registration_admin ON public.registration_table FOR ALL
  USING ( current_setting('jwt.claims.role', true) = 'ADMIN' )
  WITH CHECK ( current_setting('jwt.claims.role', true) = 'ADMIN' );

CREATE POLICY package_admin ON public.package_table FOR ALL
  USING ( current_setting('jwt.claims.role', true) = 'ADMIN' )
  WITH CHECK ( current_setting('jwt.claims.role', true) = 'ADMIN' );

CREATE POLICY scan_admin ON public.scan_table FOR ALL
  USING ( current_setting('jwt.claims.role', true) = 'ADMIN' )
  WITH CHECK ( current_setting('jwt.claims.role', true) = 'ADMIN' );

CREATE POLICY notification_admin ON public.notification_table FOR ALL
  USING ( current_setting('jwt.claims.role', true) = 'ADMIN' )
  WITH CHECK ( current_setting('jwt.claims.role', true) = 'ADMIN' );

CREATE POLICY reward_admin ON public.reward_claim_table FOR ALL
  USING ( current_setting('jwt.claims.role', true) = 'ADMIN' )
  WITH CHECK ( current_setting('jwt.claims.role', true) = 'ADMIN' );

CREATE POLICY referral_admin ON public.referral_table FOR ALL
  USING ( current_setting('jwt.claims.role', true) = 'ADMIN' )
  WITH CHECK ( current_setting('jwt.claims.role', true) = 'ADMIN' );

CREATE POLICY assignment_admin ON public.assignment_table FOR ALL
  USING ( current_setting('jwt.claims.role', true) = 'ADMIN' )
  WITH CHECK ( current_setting('jwt.claims.role', true) = 'ADMIN' );

CREATE POLICY location_admin ON public.location_table FOR ALL
  USING ( current_setting('jwt.claims.role', true) = 'ADMIN' )
  WITH CHECK ( current_setting('jwt.claims.role', true) = 'ADMIN' );

CREATE POLICY locker_admin ON public.locker_table FOR ALL
  USING ( current_setting('jwt.claims.role', true) = 'ADMIN' )
  WITH CHECK ( current_setting('jwt.claims.role', true) = 'ADMIN' );