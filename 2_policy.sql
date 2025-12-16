-- Enable row-level security
alter table public.users enable row level security;

-- Policy: Users can select only their own data
create policy "Users can select their own data"
on public.users
for select
using (auth.uid() = id);

-- Policy: Users can update only their own data
create policy "Users can update their own data"
on public.users
for update
using (auth.uid() = id);

-- Policy: Admins can select and update all data
create policy "Admins can manage all users"
on public.users
for all
using (exists (
  select 1 
  from public.users as u
  where u.id = auth.uid() and u.role = 'admin'
));

-- Policy: Allow insert for everyone (sign up)
create policy "Allow insert for everyone"
on public.users
for insert
with check (true);
