import { ApiError, check, handle, ok, readJson, requireHost, supabaseFor } from "@/server/supabase"

type Ctx = { params: Promise<{ key: string }> }

/** After a tie, the host picks the final theme: POST /api/events/[id]/theme { option_id }. */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { key } = await ctx.params
  const sb = supabaseFor(req)
  await requireHost(req, sb)
  const body = await readJson(req)
  const optionId = typeof body.option_id === "string" ? body.option_id : ""
  if (!optionId) throw new ApiError(400, "Pick one of the tied themes.")
  return ok(check(await sb.rpc("choose_theme_winner", { p_event_id: key, p_option_id: optionId })))
})
