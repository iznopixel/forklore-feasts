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

const IMAGE_WIDTHS = [384, 640, 828, 1080] as const

/** Resized, WebP-converted `src` / `srcSet` / `sizes` for a stored photo, via the Next image optimizer. */
export function photoProps(path: string | null | undefined, sizes: string) {
  const original = mediaUrl(path)
  if (!original) return null
  const at = (w: number) => `/_next/image?url=${encodeURIComponent(original)}&w=${w}&q=75`
  return { src: at(640), srcSet: IMAGE_WIDTHS.map((w) => `${at(w)} ${w}w`).join(", "), sizes }
}

/** Public URL for an object path stored in `cover_image_path` / `image_path`. */
export function mediaUrl(path?: string | null): string | null {
  if (!path) return null
  return `${url}/storage/v1/object/public/${MEDIA_BUCKET}/${path}`
}
