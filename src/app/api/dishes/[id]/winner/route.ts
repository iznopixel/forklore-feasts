import { ApiError, handle, ok, readJson, requireHost, supabaseFor } from "@/server/supabase"

type Ctx = { params: Promise<{ id: string }> }

/** A host crowns (or uncrowns) a dish at their gathering: PUT { winner: boolean } */
export const PUT = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params
  const sb = supabaseFor(req)
  await requireHost(req, sb)
  const body = await readJson(req)
  const winner = body.winner !== false
  const { error } = await sb.rpc("set_dish_winner", { p_dish_id: id, p_winner: winner })
  if (error) throw new ApiError(error.code === "42501" ? 403 : 500, error.message)
  return ok({ id, is_winner: winner })
})
