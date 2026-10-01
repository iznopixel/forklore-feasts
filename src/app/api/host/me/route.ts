import { ApiError, check, handle, ok, readJson, requireUser, supabaseFor } from "@/server/supabase"

type HostStatus = "none" | "pending" | "approved"

async function status(sb: ReturnType<typeof supabaseFor>) {
  const s = check(await sb.rpc("my_host_status")) as HostStatus
  return { status: s, isHost: s === "approved" }
}

/** The caller's host status: none | pending | approved (always none for guests). */
export const GET = handle(async (req: Request) => ok(await status(supabaseFor(req))))

/** A signed-in (non-guest) user requests host access; an admin approves it. */
export const POST = handle(async (req: Request) => {
  const sb = supabaseFor(req)
  const user = await requireUser(req, sb)
  if (user.is_anonymous) throw new ApiError(403, "Sign in with your email to request host access.")
  const body = await readJson<{ name?: unknown }>(req)
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 100) : ""
  if (!name) throw new ApiError(400, "Tell us your name.")
  check(await sb.rpc("request_host_access", { p_name: name }))
  return ok(await status(sb), 201)
})
