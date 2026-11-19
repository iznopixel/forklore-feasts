-- Each signed-in guest can upvote a recipe once and undo their vote.
alter table public.recipes add column upvote_count integer not null default 0
  constraint recipes_upvote_count_nonnegative check (upvote_count >= 0);

create table public.recipe_upvotes (
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (recipe_id, user_id)
);

create index recipe_upvotes_user_id_idx on public.recipe_upvotes (user_id);

alter table public.recipe_upvotes enable row level security;

create policy recipe_upvotes_read_own on public.recipe_upvotes
  for select to authenticated using ((select auth.uid()) = user_id);

create policy recipe_upvotes_insert_own on public.recipe_upvotes
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy recipe_upvotes_delete_own on public.recipe_upvotes
  for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, delete on public.recipe_upvotes to authenticated;

-- Keep publicly readable recipe totals in sync without exposing other guests' votes.
-- The trigger function runs with elevated privileges, but is not directly callable.
create or replace function private.sync_recipe_upvote_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if TG_OP = 'INSERT' then
    update public.recipes
    set upvote_count = upvote_count + 1
    where id = NEW.recipe_id;
    return NEW;
  elsif TG_OP = 'DELETE' then
    update public.recipes
    set upvote_count = upvote_count - 1
    where id = OLD.recipe_id;
    return OLD;
  end if;
  return null;
end;
$$;

revoke all on function private.sync_recipe_upvote_count() from public, anon, authenticated;
create trigger recipe_upvotes_count_changed
after insert or delete on public.recipe_upvotes
for each row execute function private.sync_recipe_upvote_count();
