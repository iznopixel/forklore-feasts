import { supabase } from "@/lib/supabase"
import type {
  Dish,
  DishInput,
  EventSummary,
  EventWithDishes,
  Recipe,
  RecipeInput,
  RecipeWithEvents,
} from "@/lib/types"

/** Calls our Next.js API, attaching the guest's access token so RLS knows who is asking. */
async function call<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const headers = new Headers(init.headers)
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (session) headers.set("Authorization", `Bearer ${session.access_token}`)
  let body = init.body
  if (init.json !== undefined) {
    headers.set("Content-Type", "application/json")
    body = JSON.stringify(init.json)
  }
  const res = await fetch(path, { ...init, headers, body, cache: "no-store" })
  const payload = await res.json().catch(() => null)
  if (!res.ok) throw new Error(payload?.error ?? `Request failed (${res.status})`)
  return payload as T
}

/** Returns null on 404 instead of throwing. */
async function callOrNull<T>(path: string): Promise<T | null> {
  try {
    return await call<T>(path)
  } catch (e) {
    if (e instanceof Error && /not found/i.test(e.message)) return null
    throw e
  }
}

/* ------------------------------ Events ------------------------------ */

export const fetchEvents = () => call<EventSummary[]>("/api/events")

export const fetchEventBySlug = async (slug: string) => {
  const event = await callOrNull<EventWithDishes>(`/api/events/${encodeURIComponent(slug)}`)
  if (event) {
    event.dishes = [...(event.dishes ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at))
  }
  return event
}

/* ------------------------------ Dishes ------------------------------ */

export const createDish = (input: DishInput) => call<Dish>("/api/dishes", { method: "POST", json: input })

export const updateDish = async (
  id: string,
  patch: Partial<Omit<DishInput, "event_id">> & { recipe_id?: string | null }
) => {
  await call(`/api/dishes/${id}`, { method: "PATCH", json: patch })
}

export const deleteDish = async (id: string) => {
  await call(`/api/dishes/${id}`, { method: "DELETE" })
}

export const fetchMyDishesForEvent = (eventId: string) =>
  call<Dish[]>(`/api/dishes?event_id=${encodeURIComponent(eventId)}`)

/* ------------------------------ Recipes ----------------------------- */

export interface RecipeFilters {
  search?: string
  category?: string
  tag?: string
  contributor?: string
  eventId?: string
}

export function fetchRecipes(filters: RecipeFilters = {}, limit?: number) {
  const p = new URLSearchParams()
  if (filters.search?.trim()) p.set("search", filters.search.trim())
  if (filters.category) p.set("category", filters.category)
  if (filters.tag) p.set("tag", filters.tag)
  if (filters.contributor) p.set("contributor", filters.contributor)
  if (filters.eventId) p.set("event", filters.eventId)
  if (limit) p.set("limit", String(limit))
  return call<RecipeWithEvents[]>(`/api/recipes?${p}`)
}

export const fetchRecipeFacets = () =>
  call<{ categories: string[]; tags: string[]; contributors: string[] }>("/api/recipes/facets")

export const fetchRecipeBySlug = (slug: string) =>
  callOrNull<RecipeWithEvents>(`/api/recipes/${encodeURIComponent(slug)}`)

export const createRecipe = (input: RecipeInput) => call<Recipe>("/api/recipes", { method: "POST", json: input })

export const updateRecipe = (id: string, input: RecipeInput) =>
  call<Recipe>(`/api/recipes/${id}`, { method: "PATCH", json: input })

export const deleteRecipe = async (id: string) => {
  await call(`/api/recipes/${id}`, { method: "DELETE" })
}

/* ------------------------------- Media ------------------------------ */

/** Uploads via the API (stored at <auth-user-id>/<filename>) and returns the object path. */
export async function uploadImage(file: File): Promise<string> {
  const form = new FormData()
  form.append("file", file)
  const { path } = await call<{ path: string }>("/api/uploads", { method: "POST", body: form })
  return path
}
