"use client"

import type { CSSProperties, ReactNode } from "react"
import { posterStyle } from "@/lib/taxonomy"
import type { Event } from "@/lib/types"
import { cn } from "@/lib/utils"

type PosterEvent = Pick<Event, "slug" | "title" | "theme">

/** CSS variables carrying an event's own palette. */
export function posterVars(event: PosterEvent): CSSProperties {
  const s = posterStyle(event)
  return {
    "--poster-bg": s.bg,
    "--poster-ink": s.ink,
    "--poster-accent": s.accent,
    "--misprint": s.misprint,
  } as CSSProperties
}

/**
 * Decorative scatter of stamped glyphs behind a poster. Purely ornamental:
 * positions are fixed so each poster looks hand-arranged, colours/glyphs come
 * from the event so every gathering is recognisable.
 */
export function PosterDecor({ event, density = "full" }: { event: PosterEvent; density?: "full" | "light" }) {
  const { glyphs } = posterStyle(event)
  const [Big, Mid] = glyphs
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden text-(--poster-ink)">
      <Big weight="fill" className="absolute -right-6 -bottom-8 size-56 rotate-12 opacity-[0.16] sm:size-72" />
      <Mid weight="duotone" className="absolute top-[18%] right-[8%] size-14 -rotate-12 opacity-40 sm:size-16" />
    </div>
  )
}

/** Printed surface: event palette + grain. Wrap hero/featured content in this. */
export function PosterSurface({
  event,
  className,
  children,
  decor = "full",
}: {
  event: PosterEvent
  className?: string
  children: ReactNode
  decor?: "full" | "light" | "none"
}) {
  return (
    <div
      style={posterVars(event)}
      className={cn("grain relative overflow-hidden bg-(--poster-bg) text-(--poster-ink)", className)}
    >
      {decor !== "none" && <PosterDecor event={event} density={decor} />}
      <div className="relative z-[1]">{children}</div>
    </div>
  )
}
