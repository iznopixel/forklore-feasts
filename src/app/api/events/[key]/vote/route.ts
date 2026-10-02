import { ApiError, check, handle, ok, readJson, requireUser, supabaseFor } from "@/server/supabase"
import { sanitizeVoterName } from "@/server/validate"

type Ctx = { params: Promise<{ key: string }> }

/**
 * A guest votes on the theme: POST /api/events/[id]/vote { option_id, first_name }.
 * Anonymous sessions are fine. Voting again with the same first name replaces the earlier vote.
 * Returns the guest's view of the voting (their pick, plus totals only if they're allowed to see them).
 */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { key } = await ctx.params
  const sb = supabaseFor(req)
  await requireUser(req, sb)
  const body = await readJson(req)
  const optionId = typeof body.option_id === "string" ? body.option_id : ""
  if (!optionId) throw new ApiError(400, "Pick a theme to vote for.")
  const view = check(
    await sb.rpc("cast_theme_vote", { p_event_id: key, p_option_id: optionId, p_first_name: sanitizeVoterName(body.first_name) })
  )
  return ok(view)
})
