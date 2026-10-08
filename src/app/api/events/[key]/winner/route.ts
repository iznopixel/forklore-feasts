import { ApiError, check, handle, ok, readJson, requireHost, supabaseFor } from "@/server/supabase"

type Ctx = { params: Promise<{ key: string }> }

/** Host crowns a recipe from their event's table as the winner (recipe_id: null removes the crown). */
export const PUT = handle(async (req: Request, ctx: Ctx) => {
  const { key } = await ctx.params
  const sb = supabaseFor(req)
  await requireHost(req, sb)
  const body = await readJson<{ recipe_id?: unknown }>(req)
  const recipeId = typeof body.recipe_id === "string" && body.recipe_id ? body.recipe_id : null
  if (recipeId) {
    const dishes = check(
      await sb.from("dishes").select("id").eq("event_id", key).eq("recipe_id", recipeId).limit(1)
    )
    if (!dishes || dishes.length === 0) throw new ApiError(400, "Only a recipe on this table can win.")
  }
  // RLS limits this to events the host created
  const rows = check(await sb.from("events").update({ winner_recipe_id: recipeId }).eq("id", key).select("id"))
  if (!rows || rows.length === 0) throw new ApiError(403, "You can only crown a winner at gatherings you host.")
  return ok({ id: key, winner_recipe_id: recipeId })
})
