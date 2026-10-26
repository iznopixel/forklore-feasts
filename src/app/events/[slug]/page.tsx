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
  const image = mediaUrl(event.cover_image_path)

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
