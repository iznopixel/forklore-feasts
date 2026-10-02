-- Winning dishes: a host crowns the dishes voted best at their gathering.
-- Run in the Supabase SQL editor (as admin) after hosts.sql. Safe to re-run.

alter table public.dishes add column if not exists is_winner boolean not null default false;

-- Only the hosting account can crown a dish; guests can't flip it on their own dishes.
create or replace function public.guard_dish_winner()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.is_winner := false;
  elsif new.is_winner is distinct from old.is_winner
        and coalesce(current_setting('app.crowning', true), '') <> 'on'
        and auth.uid() is not null then
    new.is_winner := old.is_winner;
  end if;
  return new;
end;
$$;
drop trigger if exists dishes_guard_winner on public.dishes;
create trigger dishes_guard_winner before insert or update on public.dishes
  for each row execute function public.guard_dish_winner();

-- Crown (or uncrown) a dish at an event the caller hosts.
create or replace function public.set_dish_winner(p_dish_id uuid, p_winner boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_host() then
    raise exception 'Only hosts can crown a dish' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.dishes d
    join public.events e on e.id = d.event_id
    where d.id = p_dish_id and e.host_user_id = auth.uid()
  ) then
    raise exception 'You can only crown dishes at gatherings you host' using errcode = '42501';
  end if;
  perform set_config('app.crowning', 'on', true);
  update public.dishes set is_winner = p_winner where id = p_dish_id;
  return p_winner;
end;
$$;
grant execute on function public.set_dish_winner(uuid, boolean) to authenticated;

notify pgrst, 'reload schema';
