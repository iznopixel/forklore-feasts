import { ApiError, check, handle, ok, requireUser, supabaseFor } from "@/server/supabase"

type Ctx = { params: Promise<{ key: string }> }

/** The key is a recipe UUID. Vote rows are only readable by their owner. */
export const GET = handle(async (req: Request, ctx: Ctx) => {
  const { key } = await ctx.params
  const sb = supabaseFor(req)
  const recipe = check(await sb.from("recipes").select("upvote_count").eq("id", key).maybeSingle())
  if (!recipe) throw new ApiError(404, "Recipe not found.")

  const token = req.headers.get("authorization")?.replace(/^Bearer\\s+/i, "")
  if (!token) return ok({ count: recipe.upvote_count, upvoted: false })
  const { data: { user } } = await sb.auth.getUser(token)
  if (!user) return ok({ count: recipe.upvote_count, upvoted: false })

  const vote = check(await sb.from("recipe_upvotes").select("recipe_id").eq("recipe_id", key).eq("user_id", user.id).maybeSingle())
  return ok({ count: recipe.upvote_count, upvoted: Boolean(vote) })
})

export const PUT = handle(async (req: Request, ctx: Ctx) => {
  const { key } = await ctx.params
  const sb = supabaseFor(req)
  await requireUser(req, sb)
  const { error } = await sb.from("recipe_upvotes").insert({ recipe_id: key })
  // Concurrent taps and retries are idempotent thanks to the composite primary key.
  if (error && error.code !== "23505") check({ data: null, error })
  const recipe = check(await sb.from("recipes").select("upvote_count").eq("id", key).single())
  return ok({ count: recipe.upvote_count, upvoted: true })
})

export const DELETE = handle(async (req: Request, ctx: Ctx) => {
  const { key } = await ctx.params
  const sb = supabaseFor(req)
  const user = await requireUser(req, sb)
  check(await sb.from("recipe_upvotes").delete().eq("recipe_id", key).eq("user_id", user.id))
  const recipe = check(await sb.from("recipes").select("upvote_count").eq("id", key).single())
  return ok({ count: recipe.upvote_count, upvoted: false })
})
