import { Suspense } from "react"
import type { Metadata } from "next"
import { createClient } from "@supabase/supabase-js"
import EventDetailPage from "@/views/event-detail"
import { mediaUrl } from "@/lib/supabase"

type Props = { params: Promise<{ slug: string }> }

/** Link previews: the event's title, blurb and cover image, read with the public key like any guest. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return {}

  const { data: event } = await createClient(url, key, { auth: { persistSession: false } })
    .from("events")
    .select("title, theme, description, cover_image_path")
    .eq("slug", slug)
    .maybeSingle()
  if (!event) return {}

  const description = [event.theme, event.description].filter(Boolean).join(" · ") || undefined
  // Social apps choke on multi-megabyte posters, so previews get the resized copy from our own domain when we know it
  const original = mediaUrl(event.cover_image_path)
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL
  const image =
    original && host ? `https://${host}/_next/image?url=${encodeURIComponent(original)}&w=1200&q=75` : original

  return {
    title: event.title,
    description,
    openGraph: { type: "website", title: event.title, description, ...(image ? { images: [{ url: image }] } : {}) },
    twitter: { card: image ? "summary_large_image" : "summary", title: event.title, description, ...(image ? { images: [image] } : {}) },
  }
}

export default function Page() {
  return (
    <Suspense>
      <EventDetailPage />
    </Suspense>
  )
}
