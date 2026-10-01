import { ApiError, check, handle, ok, readJson, requireHost, supabaseFor } from "@/server/supabase"
import { applySettled, loadThemeVoting } from "@/server/theme-voting"
import { sanitizeEvent, sanitizeThemeVoting } from "@/server/validate"

type Ctx = { params: Promise<{ key: string }> }

/** GET takes the event's slug; PATCH and DELETE take its id. */
export const GET = handle(async (req: Request, ctx: Ctx) => {
  const { key } = await ctx.params
  const sb = supabaseFor(req)
  const event = check(
    await sb.from("events").select("*, dishes (*, recipes (*))").eq("slug", key).maybeSingle()
  )
  if (!event) throw new ApiError(404, "Event not found.")
  const theme_voting = event.theme_voting_enabled ? await loadThemeVoting(sb, event.id) : null
  applySettled(event, theme_voting)
  return ok({ ...event, theme_voting })
})

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const { key } = await ctx.params
  const sb = supabaseFor(req)
  await requireHost(req, sb)
  const body = await readJson(req)
  const input = sanitizeEvent(body)
  const voting = sanitizeThemeVoting(body, input.starts_at as string)
  // RLS limits this to events the host created
  const rows = check(await sb.from("events").update(input).eq("id", key).select())
  if (!rows || rows.length === 0) throw new ApiError(403, "You can only edit gatherings you host.")
  // Voting settings are only sent while voting is still open; once it closes they're locked.
  if (voting) {
    check(
      await sb.rpc("save_theme_voting", {
        p_event_id: key,
        p_enabled: voting.enabled,
        p_deadline: voting.deadline,
        p_options: voting.options,
      })
    )
  }
  return ok(rows[0])
})

export const DELETE = handle(async (req: Request, ctx: Ctx) => {
  const { key } = await ctx.params
  const sb = supabaseFor(req)
  await requireHost(req, sb)
  const rows = check(await sb.from("events").delete().eq("id", key).select("id"))
  if (!rows || rows.length === 0) throw new ApiError(403, "You can only delete gatherings you host.")
  return ok({ id: key })
})
