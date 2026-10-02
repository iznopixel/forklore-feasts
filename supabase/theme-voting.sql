-- Theme voting: hosts can let guests vote on a gathering's theme.
-- Run in the Supabase SQL editor (as admin) after hosts.sql. Safe to re-run.
--
-- Guests stay anonymous: they vote with their guest session plus a first name.
-- One vote per first name per event (voting again with the same name replaces the earlier vote).
-- Votes and totals are never read or written directly: everything goes through the functions below.

-- 1. Settings on the event itself.
alter table public.events
  add column if not exists theme_voting_enabled boolean not null default false,
  add column if not exists theme_voting_deadline timestamptz,
  -- open -> closed (deadline passed) -> finalized (theme chosen). Moved forward lazily, see theme_voting_view().
  add column if not exists theme_voting_status text not null default 'open'
    check (theme_voting_status in ('open', 'closed', 'finalized')),
  add column if not exists theme_winner_option_id uuid;

alter table public.events drop constraint if exists events_theme_voting_needs_deadline;
alter table public.events add constraint events_theme_voting_needs_deadline
  check (not theme_voting_enabled or theme_voting_deadline is not null);

-- 2. Up to three options per event.
create table if not exists public.theme_options (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  position smallint not null check (position between 1 and 3),
  name text not null check (char_length(name) between 1 and 60),
  description text check (description is null or char_length(description) <= 140),
  created_at timestamptz not null default now(),
  unique (event_id, position) deferrable initially deferred,
  unique (id, event_id)
);

alter table public.events drop constraint if exists events_theme_winner_option_fk;
alter table public.events add constraint events_theme_winner_option_fk
  foreign key (theme_winner_option_id) references public.theme_options (id) on delete set null;

-- 3. Votes: one per (event, first name). Kept after voting closes, as the record of the result.
create table if not exists public.theme_votes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  option_id uuid not null,
  voter_name text not null check (char_length(voter_name) between 1 and 40),
  voter_key text not null,                            -- lower-cased, whitespace-collapsed voter_name
  voter_user_id uuid default auth.uid(),              -- the guest session that cast it last (to show "you voted for…")
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, voter_key),
  foreign key (option_id, event_id) references public.theme_options (id, event_id) on delete cascade
);
create index if not exists theme_votes_option_idx on public.theme_votes (option_id);
create index if not exists theme_votes_user_idx on public.theme_votes (event_id, voter_user_id);

-- 4. Row Level Security. Options are as public as the event. Votes have no policies at all:
--    only the security-definer functions below can touch them, so totals can't be peeked at early.
alter table public.theme_options enable row level security;
drop policy if exists "anyone reads theme options" on public.theme_options;
create policy "anyone reads theme options" on public.theme_options for select to anon, authenticated using (true);
alter table public.theme_votes enable row level security;
revoke all on public.theme_votes from anon, authenticated;
revoke insert, update, delete on public.theme_options from anon, authenticated;

-- 5. The voting columns on events can only be changed by the functions below (not by a plain update).
create or replace function public.guard_event_theme_voting()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') not in ('anon', 'authenticated')
     or current_setting('forklore.theme_voting', true) = 'on' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.theme_voting_enabled := false;
    new.theme_voting_deadline := null;
    new.theme_voting_status := 'open';
    new.theme_winner_option_id := null;
  else
    new.theme_voting_enabled := old.theme_voting_enabled;
    new.theme_voting_deadline := old.theme_voting_deadline;
    new.theme_voting_status := old.theme_voting_status;
    new.theme_winner_option_id := old.theme_winner_option_id;
  end if;
  return new;
end;
$$;
drop trigger if exists events_guard_theme_voting on public.events;
create trigger events_guard_theme_voting before insert or update on public.events
  for each row execute function public.guard_event_theme_voting();

-- 6. Internal: once the deadline has passed, close voting and crown a winner unless it's a tie.
--    Idempotent. Not callable from the API.
create or replace function public.theme_voting_settle(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.events%rowtype;
  top_count int;
  tied uuid[];
begin
  select * into e from public.events where id = p_event_id for update;
  if not found or not e.theme_voting_enabled or e.theme_voting_status = 'finalized'
     or e.theme_voting_deadline > now() then
    return;
  end if;

  select coalesce(max(n), 0) into top_count from (
    select count(v.id) as n
    from public.theme_options o left join public.theme_votes v on v.option_id = o.id
    where o.event_id = e.id group by o.id
  ) c;
  select array_agg(o.id) into tied from public.theme_options o
    where o.event_id = e.id
      and (select count(*) from public.theme_votes v where v.option_id = o.id) = top_count;

  perform set_config('forklore.theme_voting', 'on', true);
  if array_length(tied, 1) = 1 then
    update public.events
       set theme_voting_status = 'finalized',
           theme_winner_option_id = tied[1],
           theme = (select name from public.theme_options where id = tied[1])
     where id = e.id;
  else
    update public.events set theme_voting_status = 'closed' where id = e.id;
  end if;
  perform set_config('forklore.theme_voting', 'off', true);
end;
$$;
revoke all on function public.theme_voting_settle(uuid) from public, anon, authenticated;

-- 7. What the event page shows. Guests only get totals once voting has closed; the host always does.
create or replace function public.theme_voting_view(p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.events%rowtype;
  status text;
  is_host boolean;
  show_totals boolean;
  top_count int;
  result jsonb;
begin
  perform public.theme_voting_settle(p_event_id);
  select * into e from public.events where id = p_event_id;
  if not found or not e.theme_voting_enabled then
    return null;
  end if;

  status := case
    when e.theme_voting_status = 'finalized' then 'finalized'
    when e.theme_voting_deadline <= now() then 'closed'
    else 'open'
  end;
  is_host := auth.uid() is not null and e.host_user_id = auth.uid() and public.is_host();
  show_totals := is_host or status <> 'open';

  select coalesce(max(n), 0) into top_count from (
    select count(v.id) as n
    from public.theme_options o left join public.theme_votes v on v.option_id = o.id
    where o.event_id = e.id group by o.id
  ) c;

  select jsonb_build_object(
    'status', status,
    'deadline', e.theme_voting_deadline,
    'is_host', is_host,
    'winner_option_id', e.theme_winner_option_id,
    'my_vote_option_id', (
      select v.option_id from public.theme_votes v
      where v.event_id = e.id and auth.uid() is not null and v.voter_user_id = auth.uid()
      order by v.updated_at desc limit 1
    ),
    'total_votes', case when show_totals then (select count(*) from public.theme_votes v where v.event_id = e.id) end,
    'options', coalesce((
      select jsonb_agg(
        jsonb_build_object('id', o.id, 'position', o.position, 'name', o.name, 'description', o.description)
        || case when show_totals then jsonb_build_object('votes', c.n) else '{}'::jsonb end
        || case when status = 'closed' and show_totals and c.n = top_count then jsonb_build_object('tied', true) else '{}'::jsonb end
        order by o.position)
      from public.theme_options o
      cross join lateral (select count(*)::int as n from public.theme_votes v where v.option_id = o.id) c
      where o.event_id = e.id
    ), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;
grant execute on function public.theme_voting_view(uuid) to anon, authenticated;

-- 8. Hosts turn voting on/off and set the options + deadline (their own events only).
--    p_options: [{ "id": "<existing option id, optional>", "name": "...", "description": "..." }, ...]
create or replace function public.save_theme_voting(
  p_event_id uuid, p_enabled boolean, p_deadline timestamptz, p_options jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.events%rowtype;
  opt jsonb;
  opt_id uuid;
  pos int := 0;
  kept uuid[] := '{}';
  n_opts int;
begin
  select * into e from public.events where id = p_event_id for update;
  if not found or e.host_user_id is distinct from auth.uid() or not public.is_host() then
    raise exception 'You can only edit gatherings you host.' using errcode = '42501';
  end if;
  if e.theme_voting_enabled and e.theme_voting_deadline <= now() then
    raise exception 'Voting has closed, so the options and deadline are locked.' using errcode = '22023';
  end if;

  if not p_enabled then
    perform set_config('forklore.theme_voting', 'on', true);
    update public.events set theme_voting_enabled = false where id = e.id;
    perform set_config('forklore.theme_voting', 'off', true);
    return;
  end if;

  n_opts := case when jsonb_typeof(p_options) = 'array' then jsonb_array_length(p_options) else 0 end;
  if n_opts not between 2 and 3 then
    raise exception 'Offer two or three themes to vote on.' using errcode = '22023';
  end if;
  if p_deadline is null or p_deadline <= now() then
    raise exception 'Pick a voting deadline in the future.' using errcode = '22023';
  end if;
  if p_deadline > e.starts_at then
    raise exception 'Voting should close before the gathering starts.' using errcode = '22023';
  end if;

  -- Drop options that were removed (their votes go with them), keep ids for the rest.
  for opt in select * from jsonb_array_elements(p_options) loop
    if nullif(btrim(opt ->> 'name'), '') is null then
      raise exception 'Every theme needs a name.' using errcode = '22023';
    end if;
    if (opt ->> 'id') is not null and exists (
      select 1 from public.theme_options where id = (opt ->> 'id')::uuid and event_id = e.id
    ) then
      kept := kept || (opt ->> 'id')::uuid;
    end if;
  end loop;
  delete from public.theme_options where event_id = e.id and id <> all (kept);

  for opt in select * from jsonb_array_elements(p_options) loop
    pos := pos + 1;
    if (opt ->> 'id') is not null and (opt ->> 'id')::uuid = any (kept) then
      update public.theme_options
         set position = pos, name = btrim(opt ->> 'name'), description = nullif(btrim(opt ->> 'description'), '')
       where id = (opt ->> 'id')::uuid;
    else
      insert into public.theme_options (event_id, position, name, description)
      values (e.id, pos, btrim(opt ->> 'name'), nullif(btrim(opt ->> 'description'), ''));
    end if;
  end loop;

  perform set_config('forklore.theme_voting', 'on', true);
  update public.events
     set theme_voting_enabled = true, theme_voting_deadline = p_deadline,
         theme_voting_status = 'open', theme_winner_option_id = null
   where id = e.id;
  perform set_config('forklore.theme_voting', 'off', true);
end;
$$;
grant execute on function public.save_theme_voting(uuid, boolean, timestamptz, jsonb) to authenticated;

-- 9. A guest casts (or changes) their vote. Anonymous sessions are fine; the first name is the identity.
create or replace function public.cast_theme_vote(p_event_id uuid, p_option_id uuid, p_first_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.events%rowtype;
  v_name text := btrim(regexp_replace(coalesce(p_first_name, ''), '\s+', ' ', 'g'));
begin
  if auth.uid() is null then
    raise exception 'Guest session required.' using errcode = '42501';
  end if;
  if v_name = '' or char_length(v_name) > 40 then
    raise exception 'Add your first name (40 characters or fewer) to vote.' using errcode = '22023';
  end if;

  select * into e from public.events where id = p_event_id;
  if not found or not e.theme_voting_enabled then
    raise exception 'This gathering isn’t voting on a theme.' using errcode = '22023';
  end if;
  if e.theme_voting_status <> 'open' or e.theme_voting_deadline <= now() then
    raise exception 'Voting has closed.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.theme_options where id = p_option_id and event_id = e.id) then
    raise exception 'Pick one of the themes on the table.' using errcode = '22023';
  end if;

  insert into public.theme_votes (event_id, option_id, voter_name, voter_key, voter_user_id)
  values (e.id, p_option_id, v_name, lower(v_name), auth.uid())
  on conflict (event_id, voter_key) do update
    set option_id = excluded.option_id, voter_name = excluded.voter_name,
        voter_user_id = excluded.voter_user_id, updated_at = now();

  return public.theme_voting_view(e.id);
end;
$$;
grant execute on function public.cast_theme_vote(uuid, uuid, text) to anon, authenticated;

-- 10. After a tie, the host picks the final theme from the tied options.
create or replace function public.choose_theme_winner(p_event_id uuid, p_option_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.events%rowtype;
  v jsonb;
begin
  perform public.theme_voting_settle(p_event_id);
  select * into e from public.events where id = p_event_id for update;
  if not found or e.host_user_id is distinct from auth.uid() or not public.is_host() then
    raise exception 'You can only edit gatherings you host.' using errcode = '42501';
  end if;
  if not e.theme_voting_enabled or e.theme_voting_deadline > now() then
    raise exception 'Voting is still open.' using errcode = '22023';
  end if;
  if e.theme_voting_status = 'finalized' then
    raise exception 'The theme has already been chosen.' using errcode = '22023';
  end if;
  -- only a top-voted (tied) option can be picked
  if not exists (
    select 1 from public.theme_options o
    where o.id = p_option_id and o.event_id = e.id
      and (select count(*) from public.theme_votes x where x.option_id = o.id) = (
        select coalesce(max(n), 0) from (
          select count(*) as n from public.theme_options o2
          left join public.theme_votes x2 on x2.option_id = o2.id
          where o2.event_id = e.id group by o2.id
        ) c)
  ) then
    raise exception 'Pick one of the tied themes.' using errcode = '22023';
  end if;

  perform set_config('forklore.theme_voting', 'on', true);
  update public.events
     set theme_voting_status = 'finalized', theme_winner_option_id = p_option_id,
         theme = (select name from public.theme_options where id = p_option_id)
   where id = e.id;
  perform set_config('forklore.theme_voting', 'off', true);
  return public.theme_voting_view(e.id);
end;
$$;
grant execute on function public.choose_theme_winner(uuid, uuid) to authenticated;

-- 11. Close votes at the exact deadline: every minute, settle any vote whose deadline has passed
--     (top option becomes the theme; a tie waits for the host). Needs the pg_cron extension
--     (Supabase: Database -> Extensions -> pg_cron). Without it everything still works, but a vote only
--     settles the next time someone opens the event or the events list.
create or replace function public.theme_voting_settle_due()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  due record;
  n integer := 0;
begin
  for due in
    select id from public.events
    where theme_voting_enabled and theme_voting_status <> 'finalized' and theme_voting_deadline <= now()
  loop
    perform public.theme_voting_settle(due.id);
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke all on function public.theme_voting_settle_due() from public, anon, authenticated;

do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('forklore-theme-voting', '* * * * *', 'select public.theme_voting_settle_due()');
exception when others then
  raise notice 'pg_cron is not available (%). Votes will settle when the event or events list is next opened.', sqlerrm;
end;
$$;

-- Make the API pick up the new functions right away.
notify pgrst, 'reload schema';
