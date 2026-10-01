"use client"

import Link from "next/link"
import { ArrowRightIcon, BookOpenTextIcon, CookingPotIcon } from "@phosphor-icons/react"
import { Annotation, Flourish } from "@/components/cookbook/ornaments"
import { PosterSurface } from "@/components/cookbook/poster"
import { buttonVariants } from "@/components/ui/button"
import { distinctRecipeCount, longDate, monthDay, timeOfDay } from "@/lib/format"
import { mediaUrl } from "@/lib/supabase"
import { posterStyle } from "@/lib/taxonomy"
import type { EventSummary } from "@/lib/types"
import { cn } from "@/lib/utils"

function counts(event: EventSummary) {
  const dishes = event.dishes?.length ?? 0
  const recipes = distinctRecipeCount(event.dishes ?? [])
  return { dishes, recipes }
}

export function CountLine({ event, className }: { event: EventSummary; className?: string }) {
  const { dishes, recipes } = counts(event)
  return (
    <p className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold", className)}>
      <span className="inline-flex items-center gap-1.5">
        <BookOpenTextIcon weight="fill" className="size-4" />
        {recipes} {recipes === 1 ? "recipe" : "recipes"}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <CookingPotIcon weight="fill" className="size-4" />
        {dishes} {dishes === 1 ? "dish" : "dishes"}
      </span>
    </p>
  )
}

/** Upcoming gatherings are miniature invitation posters. */
export function PosterCard({
  event,
  featured = false,
  className,
}: {
  event: EventSummary
  featured?: boolean
  className?: string
}) {
  const d = monthDay(event.starts_at)
  const style = posterStyle(event)
  const cover = mediaUrl(event.cover_image_path)
  if (cover) {
    // The cover is a square invitation that already carries the details, so it leads; the text below is just a caption.
    return (
      <article className={cn("relative", className)}>
        <div className="tape -top-3 left-1/2 -translate-x-1/2 -rotate-3" aria-hidden="true" />
        <figure className="border border-border bg-[#fbf3e3] p-3 text-ink shadow-[5px_5px_0_rgb(44_48_37/0.18)] sm:p-4">
          <Link href={`/events/${event.slug}`} className="block outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <img src={cover} alt={`${event.title}${event.theme ? `: ${event.theme}` : ""}`} className="aspect-square w-full object-cover" />
          </Link>
          <figcaption className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 px-1 pt-4 pb-1">
            <div className="min-w-0">
              <p className="text-xs font-bold tracking-[0.22em] text-accent uppercase">
                {featured ? "You're invited" : "Save the date"}
              </p>
              <h3 className="mt-1 font-heading text-2xl leading-tight font-bold break-words">{event.title}</h3>
              <p className="mt-0.5 text-sm font-semibold">
                {longDate(event.starts_at)} · {timeOfDay(event.starts_at)}
              </p>
              <CountLine event={event} className="mt-1 text-moss" />
            </div>
            <Link href={`/events/${event.slug}`} className={cn(buttonVariants({ size: "lg" }))}>
              {featured ? "RSVP & see the menu" : "See details"}
              <ArrowRightIcon weight="bold" />
            </Link>
          </figcaption>
        </figure>
      </article>
    )
  }
  return (
    <article className={cn("relative", className)}>
      <PosterSurface event={event} className="scallop-b pb-12" decor={featured ? "full" : "light"}>
        <div className={cn("frame m-0 flex flex-col gap-4 p-7 sm:p-9", featured && "sm:p-10")}>
          <div className="flex items-start justify-between gap-4">
            <p className="text-xs font-bold tracking-[0.22em] uppercase">
              {featured ? "You're invited" : "Save the date"}
            </p>
            <div className="-mt-1 flex size-[4.75rem] shrink-0 -rotate-6 flex-col items-center justify-center rounded-full border-2 border-current text-center leading-none">
              <span className="text-[0.65rem] font-bold tracking-widest uppercase">{d.month}</span>
              <span className="font-heading text-3xl font-black">{d.day}</span>
            </div>
          </div>
          <h3
            className={cn(
              "display misprint max-w-[14ch] break-words text-[clamp(3rem,8vw,4.25rem)]",
              featured && "sm:text-[4rem]"
            )}
          >
            {event.title}
          </h3>
          {event.theme && (
            <p className="font-heading text-lg font-semibold italic">
              {event.theme}
            </p>
          )}
          <p className="max-w-[34ch] text-[0.98rem] leading-snug opacity-95">
            {event.description ? truncate(event.description, featured ? 150 : 110) : `${longDate(event.starts_at)} at ${timeOfDay(event.starts_at)}`}
          </p>
          <Flourish className="my-1 opacity-80" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <p className="font-bold">{longDate(event.starts_at)}</p>
              <p className="opacity-90">{timeOfDay(event.starts_at)}</p>
            </div>
            <CountLine event={event} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-4">
            <Link
              href={`/events/${event.slug}`}
              className={cn(
                buttonVariants({ size: "lg" }),
                "border-current bg-(--poster-ink) text-(--poster-bg) shadow-[3px_3px_0_var(--poster-accent)] hover:bg-(--poster-ink)/90"
              )}
            >
              {featured ? "RSVP & see the menu" : "See details"}
              <ArrowRightIcon weight="bold" />
            </Link>
            <Annotation className="text-(--poster-accent)" rotate={-4}>{style.scrawl}</Annotation>
          </div>
        </div>
      </PosterSurface>
    </article>
  )
}

/** Past gatherings are quieter: a printed ticket stub (or a small square snapshot when there's a cover). */
export function StubCard({ event }: { event: EventSummary }) {
  const d = monthDay(event.starts_at)
  const style = posterStyle(event)
  const Glyph = style.glyphs[0]
  const cover = mediaUrl(event.cover_image_path)
  return (
    <Link
      href={`/events/${event.slug}`}
      className={cn(
        "paper group relative grid outline-none transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/40",
        cover ? "grid-cols-[8.5rem_1fr]" : "grid-cols-[5.5rem_1fr]"
      )}
    >
      {cover ? (
        <div className="relative border-r-2 border-dashed border-border bg-[#fbf3e3] p-2">
          <img src={cover} alt="" className="aspect-square w-full object-cover" />
          <span className="font-hand absolute right-2 bottom-2 bg-[#fbf3e3]/90 px-1.5 text-base leading-tight">
            {d.month} {d.day}
          </span>
        </div>
      ) : (
        <div
          className="grain relative flex flex-col items-center justify-center gap-0.5 border-r-2 border-dashed border-border p-3 text-center"
          style={{ background: style.bg, color: style.ink }}
        >
          <Glyph weight="fill" className="mb-1 size-6 opacity-80" />
          <span className="text-[0.65rem] font-bold tracking-widest uppercase">{d.month}</span>
          <span className="font-heading text-3xl leading-none font-black">{d.day}</span>
          <span className="text-[0.65rem] tracking-widest opacity-80">{d.year}</span>
        </div>
      )}
      <div className="flex flex-col gap-1.5 p-4">
        <h3 className="font-heading text-2xl leading-tight font-bold group-hover:text-tomato">{event.title}</h3>
        {event.theme && <p className="font-heading text-sm font-semibold text-wine italic">{event.theme}</p>}
        {event.description && <p className="line-clamp-2 text-sm text-muted-foreground">{event.description}</p>}
        <CountLine event={event} className="mt-1 text-moss" />
      </div>
    </Link>
  )
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s
}
