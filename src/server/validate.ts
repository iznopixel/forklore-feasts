import "server-only"
import { ApiError } from "@/server/supabase"

type Raw = Record<string, unknown>

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "")
const optStr = (v: unknown, max: number) => str(v, max) || null
const list = (v: unknown, max: number) =>
  Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean).slice(0, max)
    : []
const optInt = (v: unknown) => (Number.isInteger(v) && (v as number) > 0 ? (v as number) : null)

/** Whitelists recipe fields — never trusts owner_user_id/slug/id from the client. */
export function sanitizeRecipe(body: Raw) {
  const name = str(body.name, 200)
  const contributor_name = str(body.contributor_name, 100)
  if (!name) throw new ApiError(400, "Recipe name is required.")
  if (!contributor_name) throw new ApiError(400, "Contributor name is required.")
  let source_url = optStr(body.source_url, 500)
  if (source_url && !/^https?:\/\//i.test(source_url)) throw new ApiError(400, "Source must be an http(s) link.")
  const out: Raw = {
    name,
    contributor_name,
    description: optStr(body.description, 2000),
    category: optStr(body.category, 60),
    ingredients: list(body.ingredients, 200),
    instructions: list(body.instructions, 200),
    tags: list(body.tags, 20).map((t) => t.toLowerCase()),
    prep_time_minutes: optInt(body.prep_time_minutes),
    cook_time_minutes: optInt(body.cook_time_minutes),
    servings: optInt(body.servings),
    source_url,
    notes: optStr(body.notes, 4000),
  }
  if ("image_path" in body) out.image_path = optStr(body.image_path, 300)
  return out
}

export function sanitizeDish(body: Raw, { requireEvent }: { requireEvent: boolean }) {
  const out: Raw = {}
  if (requireEvent) {
    const event_id = str(body.event_id, 64)
    if (!event_id) throw new ApiError(400, "event_id is required.")
    out.event_id = event_id
  }
  if (requireEvent || "name" in body) {
    out.name = str(body.name, 200)
    if (!out.name) throw new ApiError(400, "Dish name is required.")
  }
  if (requireEvent || "contributor_name" in body) {
    out.contributor_name = str(body.contributor_name, 100)
    if (!out.contributor_name) throw new ApiError(400, "Contributor name is required.")
  }
  if ("category" in body) out.category = optStr(body.category, 60)
  if ("note" in body) out.note = optStr(body.note, 1000)
  if ("recipe_id" in body) out.recipe_id = optStr(body.recipe_id, 64)
  return out
}

/** Whitelists event fields — never trusts host_user_id/slug/id from the client. */
export function sanitizeEvent(body: Raw) {
  const title = str(body.title, 120)
  if (!title) throw new ApiError(400, "Give the gathering a title.")
  const starts = typeof body.starts_at === "string" ? new Date(body.starts_at) : null
  if (!starts || Number.isNaN(starts.getTime())) throw new ApiError(400, "Pick a valid date and time.")
  const out: Raw = {
    title,
    theme: optStr(body.theme, 120),
    description: optStr(body.description, 2000),
    starts_at: starts.toISOString(),
    is_public: body.is_public !== false,
  }
  if ("cover_image_path" in body) out.cover_image_path = optStr(body.cover_image_path, 300)
  return out
}
