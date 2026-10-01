"use client"

import Link from "next/link"
import { ArrowRightIcon, BookOpenTextIcon, CalendarBlankIcon, HandHeartIcon } from "@phosphor-icons/react"
import { Annotation, Flourish, SectionHeader, Sparkle, Sprig } from "@/components/cookbook/ornaments"
import { PosterCard, StubCard } from "@/components/cookbook/event-cards"
import { RecipeCard } from "@/components/cookbook/recipe-card"
import { CardSkeletons, EmptyNote, ErrorNote } from "@/components/cookbook/states"
import { buttonVariants } from "@/components/ui/button"
import { fetchEvents, fetchRecipes } from "@/lib/api"
import { isUpcoming } from "@/lib/format"
import { useAsync } from "@/lib/use-async"
import { cn } from "@/lib/utils"

export default function HomePage() {
  const events = useAsync(fetchEvents, [])
  const recipes = useAsync(() => fetchRecipes({}, 6), [])

  const all = events.data ?? []
  const upcoming = all.filter((e) => isUpcoming(e.starts_at))
  const past = all.filter((e) => !isUpcoming(e.starts_at)).reverse()
  const featured = upcoming[0]

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <Sprig className="absolute top-10 left-[6%] hidden size-20 rotate-12 text-moss/70 lg:block" />
        <Sparkle className="absolute top-24 left-[44%] hidden size-6 text-ochre lg:block" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div>
            <Annotation className="mb-4 block text-[1.6rem]" rotate={-3}>
              ~ a neighborhood potluck cookbook ~
            </Annotation>
            <h1 className="display text-[clamp(3.4rem,10vw,6.75rem)] text-wine">
              Forklore
              <br />
              <span className="text-tomato">Feasts</span>
              <Sparkle className="ml-2 inline size-[0.45em] -translate-y-[0.5em] text-ochre" />
            </h1>
            <p className="mt-6 max-w-[34ch] font-heading text-2xl leading-snug font-medium italic">
              One long table, a dozen dishes, and every recipe written down so it never gets lost.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/events" className={cn(buttonVariants({ size: "lg" }))}>
                <CalendarBlankIcon weight="bold" /> See the gatherings
              </Link>
              <Link href="/recipes" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
                <BookOpenTextIcon weight="bold" /> Browse recipes
              </Link>
            </div>
          </div>

          <div className="relative lg:pl-4">
            <div className="tape -top-3 left-1/2 -translate-x-1/2 -rotate-3" aria-hidden="true" />
            {events.loading ? (
              <div className="paper h-[28rem] animate-pulse bg-muted/60" aria-busy="true" aria-label="Loading next gathering" />
            ) : events.error ? (
              <ErrorNote message={events.error} onRetry={events.reload} />
            ) : featured ? (
              <PosterCard event={featured} featured className="motion-safe:rotate-[1.2deg]" />
            ) : (
              <div className="paper grain relative p-8 text-center motion-safe:rotate-[1.2deg]">
                <HandHeartIcon weight="duotone" className="mx-auto size-14 text-tomato" />
                <h2 className="mt-3 font-heading text-3xl font-bold">The next feast is still being planned</h2>
                <p className="mx-auto mt-2 max-w-sm text-muted-foreground">
                  Check back soon for the next gathering. Meanwhile, the recipe box is open.
                </p>
                <Annotation className="mt-3 block" rotate={-2}>save a seat!</Annotation>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Recent recipes */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <SectionHeader
          kicker="fresh from the recipe box"
          title="Recently shared"
          action={
            <Link href="/recipes" className="inline-flex items-center gap-1 font-heading text-lg font-bold text-tomato hover:underline">
              All recipes <ArrowRightIcon weight="bold" />
            </Link>
          }
        />
        {recipes.loading ? (
          <CardSkeletons />
        ) : recipes.error ? (
          <ErrorNote message={recipes.error} onRetry={recipes.reload} />
        ) : recipes.data && recipes.data.length > 0 ? (
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.data.map((r, i) => (
              <RecipeCard key={r.id} recipe={r} index={i} />
            ))}
          </div>
        ) : (
          <EmptyNote
            title="No recipes shared yet"
            action={<Link href="/recipes/new" className={buttonVariants()}>Be the first to add one</Link>}
          >
            Once someone writes down a dish, it lands here.
          </EmptyNote>
        )}
      </section>

      {/* Past gatherings */}
      <section className="border-t border-border bg-muted/50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <SectionHeader kicker="remember when…" title="Past gatherings" />
          {events.loading ? (
            <CardSkeletons count={2} className="lg:grid-cols-2" />
          ) : past.length > 0 ? (
            <>
              <div className="grid gap-5 md:grid-cols-2">
                {past.slice(0, 4).map((e) => (
                  <StubCard key={e.id} event={e} />
                ))}
              </div>
              {past.length > 4 && (
                <Link href="/events" className="mt-6 inline-flex items-center gap-1 font-heading text-lg font-bold text-tomato hover:underline">
                  The full guest book <ArrowRightIcon weight="bold" />
                </Link>
              )}
            </>
          ) : (
            !events.error && (
              <p className="font-heading text-xl text-muted-foreground italic">
                Our first gathering is still ahead of us — memories coming soon.
              </p>
            )
          )}
          <Flourish className="mx-auto mt-14 max-w-xs text-wine" />
        </div>
      </section>
    </>
  )
}
