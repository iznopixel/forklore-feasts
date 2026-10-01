import { ApiError, check, handle, ok, supabaseFor } from "@/server/supabase"

export const GET = handle(async (req: Request, ctx: { params: Promise<{ slug: string }> }) => {
  const { slug } = await ctx.params
  const sb = supabaseFor(req)
  const event = check(
    await sb.from("events").select("*, dishes (*, recipes (*))").eq("slug", slug).maybeSingle()
  )
  if (!event) throw new ApiError(404, "Event not found.")
  return ok(event)
})
