-- Host accounts: lets approved people sign in by email and manage their own gatherings.
-- Run in the Supabase SQL editor (as admin). Safe to re-run.

-- 1. Who may host. Add an email here to invite someone; they then sign in from /host.
create table if not exists public.hosts (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);
alter table public.hosts enable row level security;  -- no policies: only is_host() and admins can see it

-- 2. True for a signed-in, non-anonymous user whose verified email is on the list.
create or replace function public.is_host()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
     and exists (select 1 from public.hosts h where h.email = lower(auth.jwt() ->> 'email'));
$$;
grant execute on function public.is_host() to authenticated;

-- 3. Events remember who created them.
alter table public.events
  add column if not exists host_user_id uuid default auth.uid() references auth.users (id) on delete set null;

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

-- Example: invite a host
-- insert into public.hosts (email) values ('someone@example.com');
