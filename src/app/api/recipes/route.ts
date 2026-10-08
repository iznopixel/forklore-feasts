import { ApiError, check, handle, ok, readJson, requireUser, supabaseFor, withWinnerColumn } from "@/server/supabase"
import { sanitizeRecipe } from "@/server/validate"

export const GET = handle(async (req: Request) => {
  const sb = supabaseFor(req)
  const p = new URL(req.url).searchParams
  const eventId = p.get("event")
  const term = p.get("search")?.trim()
  const limit = Number(p.get("limit"))
  const result = await withWinnerColumn((eventColumns) => {
    // `!inner` makes the event filter apply to the parent recipe rows
    let q = sb
      .from("recipes")
      .select(`*, dishes${eventId ? "!inner" : ""} (id, event_id, events (${eventColumns}))`)
    if (eventId) q = q.eq("dishes.event_id", eventId)
    if (p.get("category")) q = q.eq("category", p.get("category")!)
    if (p.get("tag")) q = q.contains("tags", [p.get("tag")!])
    if (p.get("contributor")) q = q.eq("contributor_name", p.get("contributor")!)
    // Indexed full-text search against the generated `search_vector` column
    if (term) q = q.textSearch("search_vector", term, { type: "websearch" })
    q = q.order("created_at", { ascending: false })
    if (limit > 0) q = q.limit(Math.min(limit, 100))
    return q
  })
  return ok(check(result))
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
