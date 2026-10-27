import { check, handle, ok, supabaseFor } from "@/server/supabase"

/**
 * Heartbeat so Supabase never sees the project as idle. Called daily by the Vercel cron in
 * vercel.json and every few hours by .github/workflows/keep-alive.yml. Each call reads from
 * the main tables with the public key, like any visitor browsing the site.
 */
export const GET = handle(async (req: Request) => {
  const sb = supabaseFor(req)
  const counts = await Promise.all(
    (["events", "recipes", "dishes"] as const).map(async (table) => {
      const { count, error } = await sb.from(table).select("id", { count: "exact", head: true })
      check({ data: null, error })
      return [table, count ?? 0] as const
    })
  )
  return ok({ ok: true, ...Object.fromEntries(counts) })
})
