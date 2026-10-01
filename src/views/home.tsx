"use client"

import Link from "next/link"
import { ArrowRightIcon, BookOpenTextIcon, CalendarBlankIcon, HandHeartIcon } from "@phosphor-icons/react"
import { Annotation, Flourish, SectionHeader, Sparkle } from "@/components/cookbook/ornaments"
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
      {/* Hero: the illustration holds the table on the left; the empty parchment on the right carries the title */}
      <section className="relative overflow-hidden border-b-[3px] border-double border-foreground/70 bg-[#f4e6c8] text-[#3b1d1c]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero-feast.webp"
          alt="An autumn potluck table: a pot of stew, a lattice-topped pie, crusty bread, pears and apples, with candles and wildflowers"
          width={1672}
          height={941}
          fetchPriority="high"
          className="aspect-[4/3] w-full object-cover object-[18%_100%] sm:aspect-[16/9] lg:aspect-[16/9]"
        />
        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:absolute lg:inset-0 lg:max-w-none lg:p-0">
          <div className="lg:absolute lg:top-[4.5%] lg:right-[4%] lg:left-[49%]">
            <Annotation className="mb-3 block text-[1.6rem] lg:mb-[0.6vw] lg:text-[2vw]" rotate={-3}>
              ~ a neighborhood potluck cookbook ~
            </Annotation>
            <h1 className="display text-[clamp(4rem,12vw,8.5rem)] text-[#6b1f33] lg:text-[6.4vw]">
              Forklore
              <br />
              <span className="text-[#c74624]">Feasts</span>
              <Sparkle className="ml-2 inline size-[0.45em] -translate-y-[0.5em] text-[#d9a441]" />
            </h1>
            <p className="mt-5 max-w-[32ch] font-heading text-2xl leading-snug font-medium italic lg:mt-[1vw] lg:max-w-[40ch] lg:text-[1.5vw]">
              One long table, a dozen dishes, and every recipe written down so it never gets lost.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-4 lg:mt-[1.3vw]">
              <Link href="/events" className={cn(buttonVariants({ size: "lg" }))}>
                <CalendarBlankIcon weight="bold" /> See the gatherings
              </Link>
              <Link
                href="/recipes"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "border-[#3b1d1c]/60 bg-[#fbf3e3]/70 text-[#3b1d1c] hover:bg-[#fbf3e3]")}
              >
                <BookOpenTextIcon weight="bold" /> Browse recipes
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Next gathering */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <Annotation className="mb-2 block" rotate={-2}>pull up a chair</Annotation>
            <h2 className="display text-[clamp(2.5rem,6vw,3.75rem)] text-wine">Next on the table</h2>
            <p className="mt-4 max-w-[36ch] text-lg text-muted-foreground">
              Bring a dish, bring a friend, and bring an appetite. Every recipe from the evening ends up in the book.
            </p>
            <Link href="/events" className="mt-5 inline-flex items-center gap-1 font-heading text-lg font-bold text-tomato hover:underline">
              All gatherings <ArrowRightIcon weight="bold" />
            </Link>
          </div>
          <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
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
                <h3 className="mt-3 font-heading text-3xl font-bold">The next feast is still being planned</h3>
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
      <section className="mx-auto max-w-6xl border-t border-border px-4 py-16 sm:px-6">
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
