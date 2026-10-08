import { ApiError, check, handle, ok, readJson, requireUser, supabaseFor } from "@/server/supabase"
import { sanitizeRecipe } from "@/server/validate"

type Ctx = { params: Promise<{ key: string }> }

/** GET takes the recipe's slug; PATCH and DELETE take its id. */
export const GET = handle(async (req: Request, ctx: Ctx) => {
  const { key } = await ctx.params
  const recipe = check(
    await supabaseFor(req)
      .from("recipes")
      .select("*, dishes (id, event_id, events (id, title, slug, starts_at, winner_recipe_id))")
      .eq("slug", key)
      .maybeSingle()
  )
  if (!recipe) throw new ApiError(404, "Recipe not found.")
  return ok(recipe)
})

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const { key } = await ctx.params
  const sb = supabaseFor(req)
  await requireUser(req, sb)
  const input = sanitizeRecipe(await readJson(req))
  // RLS limits this to the owner's rows; no match means not yours (or gone)
  const rows = check(await sb.from("recipes").update(input).eq("id", key).select())
  if (!rows || rows.length === 0) throw new ApiError(403, "You can only edit recipes you added.")
  return ok(rows[0])
})

export const DELETE = handle(async (req: Request, ctx: Ctx) => {
  const { key } = await ctx.params
  const sb = supabaseFor(req)
  await requireUser(req, sb)
  const rows = check(await sb.from("recipes").delete().eq("id", key).select("id"))
  if (!rows || rows.length === 0) throw new ApiError(403, "You can only delete recipes you added.")
  return ok({ id: key })
})
