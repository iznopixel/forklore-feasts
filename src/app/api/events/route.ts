import { check, handle, ok, readJson, requireHost, requireUser, supabaseFor } from "@/server/supabase"
import { sanitizeEvent } from "@/server/validate"

/**
 * Public listing: only is_public events. `?mine=1` (signed-in host) returns
 * every event that host created, private ones included.
 * Direct lookups by slug (/api/events/[key]) are not filtered: unlisted, not locked.
 */
export const GET = handle(async (req: Request) => {
  const sb = supabaseFor(req)
  let q = sb.from("events").select("*, dishes (id, recipe_id)").order("starts_at", { ascending: true })
  const mine = new URL(req.url).searchParams.get("mine") === "1"
  if (mine) {
    const user = await requireUser(req, sb)
    q = q.eq("host_user_id", user.id)
  } else {
    q = q.eq("is_public", true)
  }
  // The public listing is the same for everyone, so the CDN can serve it for a minute instead of asking the database each time
  return ok(check(await q), 200, mine ? "no-store" : "public, s-maxage=60, stale-while-revalidate=600")
})

/** Hosts only. host_user_id and slug are filled by the database. */
export const POST = handle(async (req: Request) => {
  const sb = supabaseFor(req)
  await requireHost(req, sb)
  const input = sanitizeEvent(await readJson(req))
  const row = check(await sb.from("events").insert(input).select().single())
  return ok(row, 201)
})
