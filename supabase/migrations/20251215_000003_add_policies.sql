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
