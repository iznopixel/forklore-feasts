-- Only the trusted counter trigger can change published vote totals.
create or replace function private.protect_recipe_upvote_count()
returns trigger language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.upvote_count is distinct from old.upvote_count
     and current_user <> 'postgres' then
    raise exception 'Recipe upvote totals are managed automatically';
  end if;
  return new;
end;
$$;

revoke all on function private.protect_recipe_upvote_count() from public, anon, authenticated;
create trigger recipe_upvote_count_protected
before update of upvote_count on public.recipes
for each row execute function private.protect_recipe_upvote_count();
