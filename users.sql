-- Drop existing users table if it exists
drop table if exists public.users cascade;

-- Create users table
create table public.users (
    id uuid primary key default gen_random_uuid(),
    email text not null unique,
    password text, -- optional if using Supabase Auth
    first_name text not null,
    last_name text not null,
    role text not null default 'user', -- 'user' or 'admin'
    created_at timestamp with time zone default now()
);

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
