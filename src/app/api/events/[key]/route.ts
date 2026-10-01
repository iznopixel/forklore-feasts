import { ApiError, check, handle, ok, readJson, requireHost, supabaseFor } from "@/server/supabase"
import { sanitizeEvent } from "@/server/validate"

type Ctx = { params: Promise<{ key: string }> }

/** GET takes the event's slug; PATCH and DELETE take its id. */
export const GET = handle(async (req: Request, ctx: Ctx) => {
  const { key } = await ctx.params
  const sb = supabaseFor(req)
  const event = check(
    await sb.from("events").select("*, dishes (*, recipes (*))").eq("slug", key).maybeSingle()
  )
  if (!event) throw new ApiError(404, "Event not found.")
  return ok(event)
})

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const { key } = await ctx.params
  const sb = supabaseFor(req)
  await requireHost(req, sb)
  const input = sanitizeEvent(await readJson(req))
  // RLS limits this to events the host created
  const rows = check(await sb.from("events").update(input).eq("id", key).select())
  if (!rows || rows.length === 0) throw new ApiError(403, "You can only edit gatherings you host.")
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
