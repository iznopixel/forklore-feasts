"use client"

import Link from "next/link"
import { ArrowRightIcon, BookOpenTextIcon, CalendarBlankIcon, HandHeartIcon } from "@phosphor-icons/react"
import { Annotation, Flourish, SectionHeader } from "@/components/cookbook/ornaments"
import { PosterCard } from "@/components/cookbook/event-cards"
import { RecipeCard } from "@/components/cookbook/recipe-card"
import { CardSkeletons, EmptyNote, ErrorNote } from "@/components/cookbook/states"
import { buttonVariants } from "@/components/ui/button"
import { fetchEvents, fetchRecipes } from "@/lib/api"
import { isUpcoming, longDate } from "@/lib/format"
import { mediaUrl } from "@/lib/supabase"
import type { EventSummary } from "@/lib/types"
import { useAsync } from "@/lib/use-async"
import { cn } from "@/lib/utils"

/** The last evening's invitation, taped up like a snapshot. */
function LastGatheringPhoto({ event }: { event: EventSummary }) {
  const cover = mediaUrl(event.cover_image_path)
  const caption = (
    <figcaption className="px-1 pt-3 pb-1">
      <h3 className="font-heading text-2xl leading-tight font-bold">{event.title}</h3>
      <Annotation className="mt-1 block" rotate={-2}>{longDate(event.starts_at)}</Annotation>
    </figcaption>
  )
  return (
    <div className="relative mx-auto w-full max-w-sm lg:max-w-none">
      <div className="tape -top-3 left-1/2 -translate-x-1/2 -rotate-3" aria-hidden="true" />
      <figure className="border border-border bg-[#fbf3e3] p-3 text-ink shadow-[5px_5px_0_rgb(44_48_37/0.18)] motion-safe:-rotate-[1deg]">
        <Link href={`/events/${event.slug}`} className="block outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt={`${event.title}${event.theme ? `: ${event.theme}` : ""}`} className="aspect-square w-full object-cover" />
          ) : (
            <div className="grain flex aspect-square w-full items-center justify-center bg-muted p-6 text-center">
              <span className="display text-4xl text-wine">{event.title}</span>
            </div>
          )}
        </Link>
        {caption}
      </figure>
    </div>
  )
}

export default function HomePage() {
  const events = useAsync(fetchEvents, [])

  const all = events.data ?? []
  const upcoming = all.filter((e) => isUpcoming(e.starts_at))
  const past = all.filter((e) => !isUpcoming(e.starts_at)).reverse()
  const featured = upcoming[0]
  const last = past[0]
  const recipes = useAsync(() => (last ? fetchRecipes({ eventId: last.id }, 6) : Promise.resolve([])), [last?.id])

  return (
    <>
      {/* Hero: candlelit table photo; a warm scrim carries the title on desktop, stacked beneath the photo on phones */}
      <section className="relative overflow-hidden border-b-[3px] border-double border-foreground/70 bg-[#f1e6cf] text-[#2c3025] lg:bg-[#2a1a12] lg:text-[#fbf3e3]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero-feast.webp"
          alt="Friends clinking wine glasses over a candlelit table of squash soup, crusty bread and a big wooden bowl of salad"
          width={1448}
          height={1086}
          fetchPriority="high"
          className="aspect-[4/3] w-full object-cover object-[45%_50%] sm:aspect-[16/10] lg:aspect-auto lg:h-[min(46rem,56vw)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(90deg,rgb(42_26_18/0.9)_0%,rgb(42_26_18/0.72)_32%,rgb(42_26_18/0.1)_62%,transparent_80%)] lg:block"
        />
        <div className="relative mx-auto px-4 py-10 sm:px-6 lg:absolute lg:inset-0 lg:flex lg:max-w-none lg:items-center lg:p-0 lg:pl-[max(2rem,calc((100vw-72rem)/2+1.5rem))]">
          <div className="lg:max-w-[min(34rem,46vw)]">
            <Annotation className="mb-5 block text-[1.6rem] text-[#552829] lg:mb-4 lg:text-[#f0c9a0]" rotate={-3}>
              ~ come hungry, stay awhile ~
            </Annotation>
            <h1 className="display text-[clamp(4rem,12vw,8.5rem)] text-[#2c3025] lg:text-[clamp(4.5rem,8vw,7.5rem)] lg:text-[#fbf3e3]">
              Forklore
              <br />
              <span className="text-[#552829] lg:text-[#f2b9a8]">Feasts</span>
            </h1>
            <p className="mt-5 max-w-[32ch] font-heading text-2xl leading-snug font-medium italic lg:mt-5 lg:max-w-[34ch]">
              Gather around good food. RSVP, pull up a chair, and share the recipes worth keeping.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <Link href="/events" className={cn(buttonVariants({ size: "lg" }), "lg:bg-[#fbf3e3] lg:text-[#2c3025] lg:hover:bg-[#fff8ea]")}>
                <CalendarBlankIcon weight="bold" /> RSVP to a gathering
              </Link>
              <Link
                href="/recipes/new"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "border-[#2c3025]/60 bg-[#f4eedc]/70 text-[#2c3025] hover:bg-[#f4eedc] lg:border-[#fbf3e3]/70 lg:bg-transparent lg:text-[#fbf3e3] lg:hover:bg-[#fbf3e3]/15"
                )}
              >
                <BookOpenTextIcon weight="bold" /> Share a recipe
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Next gathering */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,34rem)_1fr] lg:gap-16">
          <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
            {events.loading ? (
              <div className="paper aspect-square animate-pulse bg-muted/60" aria-busy="true" aria-label="Loading next gathering" />
            ) : events.error ? (
              <ErrorNote message={events.error} onRetry={events.reload} />
            ) : featured ? (
              <PosterCard event={featured} featured className="motion-safe:-rotate-[1deg]" />
            ) : (
              <div className="paper grain relative p-8 text-center">
                <div className="tape -top-3 left-1/2 -translate-x-1/2 -rotate-3" aria-hidden="true" />
                <HandHeartIcon weight="duotone" className="mx-auto size-14 text-tomato" />
                <h3 className="mt-3 font-heading text-3xl font-bold">The next supper is still being set</h3>
                <p className="mx-auto mt-2 max-w-sm text-muted-foreground">
                  An invitation will be along soon. Until then, the recipe box is open.
                </p>
                <Annotation className="mt-3 block" rotate={-2}>save a seat!</Annotation>
              </div>
            )}
          </div>
          <div>
            <Annotation className="mb-4 block" rotate={-2}>save your seat</Annotation>
            <h2 className="display text-[clamp(2.5rem,6vw,3.75rem)] text-wine">Next on the table</h2>
            <p className="mt-4 max-w-[36ch] text-lg text-muted-foreground">
              Light the candles, set out the good bowls, and RSVP. Tell us what you’re bringing, and the recipe finds its way into the book.
            </p>
            <Link href="/events" className="mt-5 inline-flex items-center gap-1 font-heading text-lg font-bold text-tomato hover:underline">
              All gatherings <ArrowRightIcon weight="bold" />
            </Link>
          </div>
        </div>
      </section>

      {/* Last gathering: its invitation beside the recipes that were on the table */}
      <section className="border-t border-border bg-sky">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <SectionHeader
            kicker="remember when…"
            title="From our last gathering"
            action={
              <Link href="/recipes" className="inline-flex items-center gap-1 font-heading text-lg font-bold text-tomato hover:underline">
                All recipes <ArrowRightIcon weight="bold" />
              </Link>
            }
          />
          {events.loading || (last && recipes.loading) ? (
            <CardSkeletons count={2} className="lg:grid-cols-2" />
          ) : events.error ? (
            <ErrorNote message={events.error} onRetry={events.reload} />
          ) : last ? (
            <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,22rem)_1fr] lg:gap-14">
              <LastGatheringPhoto event={last} />
              {recipes.error ? (
                <ErrorNote message={recipes.error} onRetry={recipes.reload} />
              ) : recipes.data && recipes.data.length > 0 ? (
                <div className="grid gap-7 sm:grid-cols-2">
                  {recipes.data.map((r, i) => (
                    <RecipeCard key={r.id} recipe={r} index={i} />
                  ))}
                </div>
              ) : (
                <EmptyNote
                  title="No recipes were passed around"
                  action={<Link href="/recipes/new" className={buttonVariants()}>Share a recipe</Link>}
                >
                  Nothing written down from that evening yet. Share a favorite for the next one.
                </EmptyNote>
              )}
            </div>
          ) : (
            <p className="font-heading text-xl text-muted-foreground italic">
              Our first evening together is still ahead. The candles are almost lit.
            </p>
          )}
          <Flourish className="mx-auto mt-14 max-w-xs text-wine" />
        </div>
      </section>
    </>
  )
}
