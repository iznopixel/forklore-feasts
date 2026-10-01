-- Host accounts: lets approved people sign in by email and manage their own gatherings.
-- Run in the Supabase SQL editor (as admin). Safe to re-run.

-- 1. Host accounts. Anyone can sign in by email and request access; an admin approves.
create table if not exists public.hosts (
  email text primary key check (email = lower(email)),
  name text,
  status text not null default 'pending' check (status in ('pending', 'approved')),
  created_at timestamptz not null default now()
);
-- Upgrading from the earlier allowlist-only version: existing rows were already approved.
alter table public.hosts add column if not exists name text;
alter table public.hosts add column if not exists status text not null default 'approved'
  check (status in ('pending', 'approved'));
alter table public.hosts alter column status set default 'pending';
alter table public.hosts enable row level security;  -- no policies: reachable only via the functions below and by admins

-- 2. True for a signed-in, non-anonymous user whose verified email is an approved host.
create or replace function public.is_host()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
     and exists (
       select 1 from public.hosts h
       where h.email = lower(auth.jwt() ->> 'email') and h.status = 'approved'
     );
$$;
grant execute on function public.is_host() to authenticated;

-- The caller's own host status: 'none', 'pending' or 'approved'.
create or replace function public.my_host_status()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select h.status from public.hosts h where h.email = lower(auth.jwt() ->> 'email')),
    'none'
  );
$$;
grant execute on function public.my_host_status() to authenticated;

-- A signed-in (non-guest) user asks to become a host. Always lands as 'pending'.
create or replace function public.request_host_access(p_name text)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, true) or (auth.jwt() ->> 'email') is null then
    raise exception 'Sign in with your email first' using errcode = '42501';
  end if;
  insert into public.hosts (email, name)
  values (lower(auth.jwt() ->> 'email'), nullif(trim(p_name), ''))
  on conflict (email) do nothing;
  return public.my_host_status();
end;
$$;
grant execute on function public.request_host_access(text) to authenticated;

-- 3. Events remember who created them.
alter table public.events
  add column if not exists host_user_id uuid default auth.uid() references auth.users (id) on delete set null;

-- Unlisted events: is_public = false hides an event from listings but not from direct links.
alter table public.events add column if not exists is_public boolean not null default true;

-- 4. Hosts can create events, and edit/delete the ones they created. Reads stay as they are.
drop policy if exists "hosts insert own events" on public.events;
create policy "hosts insert own events" on public.events
  for insert to authenticated
  with check (public.is_host() and host_user_id = auth.uid());

drop policy if exists "hosts update own events" on public.events;
create policy "hosts update own events" on public.events
  for update to authenticated
  using (public.is_host() and host_user_id = auth.uid())
  with check (public.is_host() and host_user_id = auth.uid());

drop policy if exists "hosts delete own events" on public.events;
create policy "hosts delete own events" on public.events
  for delete to authenticated
  using (public.is_host() and host_user_id = auth.uid());

-- Admin: review requests and approve (run as admin in the SQL editor)
-- select email, name, created_at from public.hosts where status = 'pending';
-- update public.hosts set status = 'approved' where email = 'someone@example.com';
-- Revoke: update public.hosts set status = 'pending' where email = '...';  (or delete the row)
