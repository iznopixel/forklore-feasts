import "server-only"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

export const MEDIA_BUCKET = "forklore-media"

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
  }
}

/**
 * A Supabase client that acts *as the caller*: the guest's access token is
 * forwarded so Row Level Security sees `auth.uid()`. Only the publishable key
 * is ever used here — no service-role key.
 */
export function supabaseFor(req: Request): SupabaseClient {
  if (!url || !key) throw new ApiError(500, "Supabase is not configured on the server.")
  const authorization = req.headers.get("authorization")
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: authorization ? { Authorization: authorization } : {} },
  })
}

/** Resolves the signed-in (anonymous) guest or throws 401. */
export async function requireUser(req: Request, sb: SupabaseClient) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) throw new ApiError(401, "Guest session required.")
  const { data, error } = await sb.auth.getUser(token)
  if (error || !data.user) throw new ApiError(401, "Your guest session has expired. Refresh the page.")
  return data.user
}

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } })
}

/** Wraps a handler so thrown ApiErrors / Supabase errors become JSON responses. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args)
    } catch (e) {
      if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status })
      const message = e instanceof Error ? e.message : "Unexpected error"
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }
}

/** Convert a PostgREST error into an ApiError with a sensible status. */
export function check<T>(result: { data: T; error: { message: string; code?: string } | null }): T {
  if (result.error) {
    const { code, message } = result.error
    const status = code === "42501" ? 403 : code === "22P02" ? 400 : code === "PGRST116" ? 404 : code?.startsWith("PGRST") ? 400 : 500
    throw new ApiError(status, message)
  }
  return result.data
}

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T
  } catch {
    throw new ApiError(400, "Request body must be JSON.")
  }
}

/** Like requireUser, but the caller must be a signed-in (non-guest) approved host. */
export async function requireHost(req: Request, sb: SupabaseClient) {
  const user = await requireUser(req, sb)
  if (user.is_anonymous) throw new ApiError(403, "Sign in as a host to manage gatherings.")
  const { data, error } = await sb.rpc("is_host")
  if (error) throw new ApiError(500, error.message)
  if (data !== true) throw new ApiError(403, "This account isn’t set up as a host yet.")
  return user
}

type Result<T> = { data: T; error: { message: string; code?: string } | null }

/**
 * Recipe queries embed each event's `winner_recipe_id`. Until supabase/hosts.sql has added that
 * column, retry without it so recipes keep loading (they just show no crown).
 */
export async function withWinnerColumn<T>(run: (eventColumns: string) => PromiseLike<Result<T>>): Promise<Result<T>> {
  const result = await run("id, title, slug, starts_at, winner_recipe_id")
  if (result.error && /winner_recipe_id/.test(result.error.message)) {
    return run("id, title, slug, starts_at")
  }
  return result
}
