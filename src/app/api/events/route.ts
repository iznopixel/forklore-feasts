import { check, handle, ok, readJson, requireHost, requireUser, supabaseFor } from "@/server/supabase"
import { applySettled, loadThemeVoting, needsSettling } from "@/server/theme-voting"
import { sanitizeEvent, sanitizeThemeVoting } from "@/server/validate"
import type { Event } from "@/lib/types"

/**
 * Public listing: only is_public events. `?mine=1` (signed-in host) returns
 * every event that host created, private ones included.
 * Direct lookups by slug (/api/events/[key]) are not filtered: unlisted, not locked.
 */
export const GET = handle(async (req: Request) => {
  const sb = supabaseFor(req)
  let q = sb.from("events").select("*, dishes (id, recipe_id)").order("starts_at", { ascending: true })
  if (new URL(req.url).searchParams.get("mine") === "1") {
    const user = await requireUser(req, sb)
    q = q.eq("host_user_id", user.id)
  } else {
    q = q.eq("is_public", true)
  }
  const events = check(await q) as (Event & { dishes: unknown[] })[]
  // Votes that closed since the last visit: settle them so the cards show the winning theme.
  await Promise.all(
    events.filter((e) => needsSettling(e)).map(async (e) => applySettled(e, await loadThemeVoting(sb, e.id)))
  )
  return ok(events)
})

/** Hosts only. host_user_id and slug are filled by the database. */
export const POST = handle(async (req: Request) => {
  const sb = supabaseFor(req)
  await requireHost(req, sb)
  const body = await readJson(req)
  const input = sanitizeEvent(body)
  const voting = sanitizeThemeVoting(body, input.starts_at as string)
  const row = check(await sb.from("events").insert(input).select().single())
  if (voting?.enabled) {
    const { error } = await sb.rpc("save_theme_voting", {
      p_event_id: row.id,
      p_enabled: true,
      p_deadline: voting.deadline,
      p_options: voting.options,
    })
    if (error) {
      await sb.from("events").delete().eq("id", row.id) // don't leave a half-made gathering behind
      check({ data: null, error })
    }
  }
  return ok(row, 201)
})
