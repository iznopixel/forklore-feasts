import { check, handle, ok, supabaseFor } from "@/server/supabase"

/** Whether the caller is an approved host (always false for guests). */
export const GET = handle(async (req: Request) => {
  const sb = supabaseFor(req)
  const isHost = check(await sb.rpc("is_host")) === true
  return ok({ isHost })
})
