import { ApiError, check, handle, ok, readJson, requireUser, supabaseFor } from "@/server/supabase"
import { sanitizeDish } from "@/server/validate"

type Ctx = { params: Promise<{ id: string }> }

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params
  const sb = supabaseFor(req)
  await requireUser(req, sb)
  const patch = sanitizeDish(await readJson(req), { requireEvent: false })
  const rows = check(await sb.from("dishes").update(patch).eq("id", id).select())
  if (!rows || rows.length === 0) throw new ApiError(403, "You can only edit dishes you added.")
  return ok(rows[0])
})

export const DELETE = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params
  const sb = supabaseFor(req)
  await requireUser(req, sb)
  const rows = check(await sb.from("dishes").delete().eq("id", id).select("id"))
  if (!rows || rows.length === 0) throw new ApiError(403, "You can only remove dishes you added.")
  return ok({ id })
})
