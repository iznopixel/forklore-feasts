import { check, handle, ok, supabaseFor } from "@/server/supabase"

export const GET = handle(async (req: Request) => {
  const sb = supabaseFor(req)
  const data = check(
    await sb.from("events").select("*, dishes (id, recipe_id)").order("starts_at", { ascending: true })
  )
  return ok(data)
})
