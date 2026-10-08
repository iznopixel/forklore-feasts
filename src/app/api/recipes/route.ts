import { ApiError, check, handle, ok, readJson, requireUser, supabaseFor } from "@/server/supabase"
import { sanitizeRecipe } from "@/server/validate"

const WITH_EVENTS = "dishes (id, event_id, events (id, title, slug, starts_at, winner_recipe_id))"

export const GET = handle(async (req: Request) => {
  const sb = supabaseFor(req)
  const p = new URL(req.url).searchParams
  const eventId = p.get("event")
  // `!inner` makes the event filter apply to the parent recipe rows
  let q = sb
    .from("recipes")
    .select(eventId ? "*, dishes!inner (id, event_id, events (id, title, slug, starts_at, winner_recipe_id))" : `*, ${WITH_EVENTS}`)
  if (eventId) q = q.eq("dishes.event_id", eventId)
  if (p.get("category")) q = q.eq("category", p.get("category")!)
  if (p.get("tag")) q = q.contains("tags", [p.get("tag")!])
  if (p.get("contributor")) q = q.eq("contributor_name", p.get("contributor")!)
  const term = p.get("search")?.trim()
  // Indexed full-text search against the generated `search_vector` column
  if (term) q = q.textSearch("search_vector", term, { type: "websearch" })
  q = q.order("created_at", { ascending: false })
  const limit = Number(p.get("limit"))
  if (limit > 0) q = q.limit(Math.min(limit, 100))
  return ok(check(await q))
})

export const POST = handle(async (req: Request) => {
  const sb = supabaseFor(req)
  await requireUser(req, sb)
  const input = sanitizeRecipe(await readJson(req))
  // owner_user_id is filled by the database from auth.uid()
  const recipe = check(await sb.from("recipes").insert(input).select().single())
  if (!recipe) throw new ApiError(500, "Recipe was not created.")
  return ok(recipe, 201)
})
