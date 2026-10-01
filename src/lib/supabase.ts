import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

export const isSupabaseConfigured = Boolean(url && key)

/**
 * Browser-side client, used only for the guest session (anonymous sign-in).
 * All data reads/writes go through the Next.js API routes under /api.
 * Publishable key only.
 */
export const supabase = createClient(url || "http://localhost:54321", key || "missing-publishable-key")

export const MEDIA_BUCKET = "forklore-media"

/** Public URL for an object path stored in `cover_image_path` / `image_path`. */
export function mediaUrl(path?: string | null): string | null {
  if (!path) return null
  return `${url}/storage/v1/object/public/${MEDIA_BUCKET}/${path}`
}
