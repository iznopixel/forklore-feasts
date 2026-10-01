"use client"

import Link from "next/link"
import { CalendarBlankIcon, UserIcon } from "@phosphor-icons/react"
import { Badge } from "@/components/ui/badge"
import { categoryIcon } from "@/lib/taxonomy"
import { mediaUrl } from "@/lib/supabase"
import type { RecipeWithEvents } from "@/lib/types"
import { cn } from "@/lib/utils"

const TILTS = [
  "motion-safe:-rotate-[0.8deg]",
  "motion-safe:rotate-[0.6deg]",
  "motion-safe:-rotate-[0.3deg]",
  "motion-safe:rotate-[1deg]",
]

export function RecipeCard({ recipe, index = 0 }: { recipe: RecipeWithEvents; index?: number }) {
  const Icon = categoryIcon(recipe.category)
  const image = mediaUrl(recipe.image_path)
  const events = recipe.dishes
    .map((d) => d.events)
    .filter((e): e is NonNullable<typeof e> => Boolean(e))
  const firstEvent = events[0]

  return (
    <Link
      href={`/recipes/${recipe.slug}`}
      className={cn(
        "index-card group relative flex flex-col transition-transform duration-200 outline-none hover:rotate-0 focus-visible:ring-3 focus-visible:ring-ring/40 motion-reduce:transition-none",
        TILTS[index % TILTS.length]
      )}
    >
      {image && (
        <div className="relative m-3 mb-0 aspect-[4/3] overflow-hidden border border-border bg-muted">
          <img src={image} alt="" loading="lazy" className="size-full object-cover sepia-[0.15]" />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-3 p-4 pt-3">
        <div className="flex items-start justify-between gap-3">
          <p className="flex items-center gap-1.5 text-[0.7rem] font-bold tracking-[0.14em] text-moss uppercase">
            <Icon weight="fill" className="size-4" />
            {recipe.category ?? "Dish"}
          </p>
        </div>
        <h3 className="font-heading text-[1.65rem] leading-[1.05] font-bold text-foreground group-hover:text-tomato">
          {recipe.name}
        </h3>
        <dl className="mt-auto space-y-1 border-t border-dashed border-border pt-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <UserIcon weight="bold" className="size-4 shrink-0 text-wine" />
            <dt className="sr-only">Contributed by</dt>
            <dd>{recipe.contributor_name}</dd>
          </div>
          {firstEvent && (
            <div className="flex items-center gap-2">
              <CalendarBlankIcon weight="bold" className="size-4 shrink-0 text-wine" />
              <dt className="sr-only">Event</dt>
              <dd className="truncate">
                {firstEvent.title}
                {events.length > 1 && ` +${events.length - 1}`}
              </dd>
            </div>
          )}
        </dl>
        {recipe.tags.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {recipe.tags.slice(0, 3).map((t) => (
              <li key={t}>
                <Badge variant="outline" className="border-moss/60 text-moss">{t}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Link>
  )
}
