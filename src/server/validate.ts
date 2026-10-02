import "server-only"
import { inferDietaryTags } from "@/lib/dietary"
import { ApiError } from "@/server/supabase"

type Raw = Record<string, unknown>

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "")
const optStr = (v: unknown, max: number) => str(v, max) || null
const list = (v: unknown, max: number) =>
  Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean).slice(0, max)
    : []
const optInt = (v: unknown) => (Number.isInteger(v) && (v as number) > 0 ? (v as number) : null)

/** Whitelists recipe fields — never trusts owner_user_id/slug/id/tags from the client. */
export function sanitizeRecipe(body: Raw) {
  const name = str(body.name, 200)
  const contributor_name = str(body.contributor_name, 100)
  if (!name) throw new ApiError(400, "Recipe name is required.")
  if (!contributor_name) throw new ApiError(400, "Contributor name is required.")
  let source_url = optStr(body.source_url, 500)
  if (source_url && !/^https?:\/\//i.test(source_url)) throw new ApiError(400, "Source must be an http(s) link.")
  const ingredients = list(body.ingredients, 200)
  const out: Raw = {
    name,
    contributor_name,
    description: optStr(body.description, 2000),
    category: optStr(body.category, 60),
    ingredients,
    instructions: list(body.instructions, 200),
    // Tags are worked out from the ingredients; the client can't set them.
    tags: inferDietaryTags(ingredients),
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

/**
 * Theme voting settings from the event form, or undefined when the body doesn't mention them.
 * The database re-checks all of this; failing early just gives friendlier errors.
 */
export function sanitizeThemeVoting(body: Raw, startsAt: string) {
  const raw = body.theme_voting
  if (raw === undefined) return undefined
  const tv = (raw && typeof raw === "object" ? raw : {}) as Raw
  if (tv.enabled !== true) return { enabled: false, deadline: null, options: [] }
  const deadline = typeof tv.deadline === "string" ? new Date(tv.deadline) : null
  if (!deadline || Number.isNaN(deadline.getTime())) throw new ApiError(400, "Pick a voting deadline.")
  if (deadline.getTime() <= Date.now()) throw new ApiError(400, "The voting deadline needs to be in the future.")
  if (deadline.getTime() > new Date(startsAt).getTime()) throw new ApiError(400, "Voting should close before the gathering starts.")
  const options = Array.isArray(tv.options) ? tv.options : []
  if (options.length < 2 || options.length > 3) throw new ApiError(400, "Offer two or three themes to vote on.")
  return {
    enabled: true,
    deadline: deadline.toISOString(),
    options: options.map((o: Raw) => {
      const name = str(o?.name, 60)
      if (!name) throw new ApiError(400, "Every theme needs a name.")
      return { id: optStr(o.id, 64), name, description: optStr(o.description, 140) }
    }),
  }
}

/** Voter's first name, trimmed and with runs of spaces collapsed. */
export function sanitizeVoterName(v: unknown) {
  const name = str(v, 200).replace(/\s+/g, " ")
  if (!name || name.length > 40) throw new ApiError(400, "Add your first name (40 characters or fewer) to vote.")
  return name
}
