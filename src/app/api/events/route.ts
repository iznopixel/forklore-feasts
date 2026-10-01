import { check, handle, ok, readJson, requireHost, supabaseFor } from "@/server/supabase"
import { sanitizeEvent } from "@/server/validate"

export const GET = handle(async (req: Request) => {
  const sb = supabaseFor(req)
  const data = check(
    await sb.from("events").select("*, dishes (id, recipe_id)").order("starts_at", { ascending: true })
  )
  return ok(data)
})

/** Hosts only. host_user_id and slug are filled by the database. */
export const POST = handle(async (req: Request) => {
  const sb = supabaseFor(req)
  await requireHost(req, sb)
  const input = sanitizeEvent(await readJson(req))
  const row = check(await sb.from("events").insert(input).select().single())
  return ok(row, 201)
})
