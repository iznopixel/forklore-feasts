-- Guests (anonymous, role `authenticated`) have no access to the `private`
-- schema, so inserting a recipe failed with "permission denied for schema private"
-- when the BEFORE INSERT triggers fired. Run these trigger functions as their
-- owner instead of widening guest access to `private`.
--
-- search_path is pinned (required for SECURITY DEFINER) and includes `public`
-- so any unqualified references to public tables/functions keep resolving.

alter function private.set_recipe_search_vector() security definer set search_path = public, pg_temp;
alter function private.set_recipe_slug()          security definer set search_path = public, pg_temp;
alter function private.set_updated_at()           security definer set search_path = public, pg_temp;

-- Trigger functions should never be callable directly through the API.
revoke execute on function private.set_recipe_search_vector() from public, anon, authenticated;
revoke execute on function private.set_recipe_slug()          from public, anon, authenticated;
revoke execute on function private.set_updated_at()           from public, anon, authenticated;
