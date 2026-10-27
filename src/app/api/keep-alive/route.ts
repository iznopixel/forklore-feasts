import { check, handle, ok, supabaseFor } from "@/server/supabase"

/** Hit daily by the Vercel cron in vercel.json: one tiny read so Supabase never sees the project as idle. */
export const GET = handle(async (req: Request) => {
  check(await supabaseFor(req).from("events").select("id").limit(1))
  return ok({ ok: true })
})
