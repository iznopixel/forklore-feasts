import { ApiError, check, handle, ok, readJson, requireUser, supabaseFor } from "@/server/supabase"
import { sanitizeDish } from "@/server/validate"

/** The signed-in guest's own dishes at an event: GET /api/dishes?event_id=… */
export const GET = handle(async (req: Request) => {
  const sb = supabaseFor(req)
  const user = await requireUser(req, sb)
  const eventId = new URL(req.url).searchParams.get("event_id")
  if (!eventId) throw new ApiError(400, "event_id is required.")
  const rows = check(
    await sb
      .from("dishes")
      .select("*")
      .eq("event_id", eventId)
      .eq("owner_user_id", user.id)
      .order("created_at", { ascending: true })
  )
  return ok(rows)
})

export const POST = handle(async (req: Request) => {
  const sb = supabaseFor(req)
  await requireUser(req, sb)
  const input = sanitizeDish(await readJson(req), { requireEvent: true })
  const dish = check(await sb.from("dishes").insert(input).select().single())
  return ok(dish, 201)
})
