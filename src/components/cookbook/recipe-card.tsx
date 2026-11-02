"use client"

import Link from "next/link"
import { CrownStamp } from "@/components/cookbook/ornaments"
import { photoProps } from "@/lib/supabase"
import { categoryIcon, posterStyle } from "@/lib/taxonomy"
import type { RecipeWithEvents } from "@/lib/types"
import { cn } from "@/lib/utils"

const TILTS = [
  "motion-safe:-rotate-[0.8deg]",
  "motion-safe:rotate-[0.6deg]",
  "motion-safe:-rotate-[0.3deg]",
  "motion-safe:rotate-[1deg]",
]

/**
 * Stands in for a photo on a card that has none.
 * Stacked: it only fills whatever height the row gives the card (zero when the card isn't stretched, so it costs
 * no layout) and shows once there's enough room to read as a photo. Side: it is the thumbnail, always shown.
 */
function DishPlaceholder({ recipe, layout }: { recipe: RecipeWithEvents; layout: Layout }) {
  const style = posterStyle({ slug: recipe.slug, title: recipe.name, theme: null })
  const Glyph = categoryIcon(recipe.category)
  const picture = (className: string) => (
    <div className={cn("grain flex items-center justify-center overflow-hidden border border-border", className)} style={{ background: style.bg, color: style.ink }}>
      <Glyph weight="fill" className={cn("opacity-80", layout === "side" ? "size-10" : "size-14")} />
    </div>
  )
  if (layout === "side") return <div className="m-3 mr-0 w-28 shrink-0 self-stretch sm:w-32" aria-hidden="true">{picture("size-full min-h-24")}</div>
  return (
    <div className="relative min-h-0 flex-1 [container-type:size]" aria-hidden="true">
      {picture("absolute inset-x-3 top-3 bottom-0 hidden flex-col [@container(min-height:7rem)]:flex")}
    </div>
  )
}

type Layout = "stacked" | "side"

/**
 * A recipe written out by hand on an index card.
 * "stacked" puts the photo on top at full size (recipes page); "side" tucks a small one to the left (home page).
 */
export function RecipeCard({
  recipe,
  index = 0,
  layout = "stacked",
}: {
  recipe: RecipeWithEvents
  index?: number
  layout?: Layout
}) {
  const side = layout === "side"
  const image = photoProps(recipe.image_path, side ? "8rem" : "(min-width: 640px) 20rem, 90vw")
  const won = recipe.dishes.some((d) => d.events?.winner_recipe_id === recipe.id)

  return (
    <Link
      href={`/recipes/${recipe.slug}`}
      className={cn(
        "index-card group relative flex min-w-0 transition-transform duration-200 outline-none hover:rotate-0 focus-visible:ring-3 focus-visible:ring-ring/40 motion-reduce:transition-none",
        side ? "flex-row" : "flex-col",
        TILTS[index % TILTS.length]
      )}
    >
      {won && <CrownStamp className="absolute -right-3 -bottom-4 z-10" />}
      {image ? (
        <div
          className={cn(
            "relative overflow-hidden border border-border bg-muted",
            side ? "m-3 mr-0 min-h-24 w-28 shrink-0 self-stretch sm:w-32" : "m-3 mb-0 aspect-[4/3]"
          )}
        >
          <img {...image} alt="" loading="lazy" className="size-full max-w-full object-cover sepia-[0.15]" />
        </div>
      ) : (
        <DishPlaceholder recipe={recipe} layout={layout} />
      )}
      <div className={cn("flex flex-col gap-2 p-5 pt-4", side && "min-w-0 flex-1 justify-center p-4")}>
        <h3 className="font-hand text-[1.85rem] leading-[1.05] font-bold break-words text-foreground group-hover:text-tomato">
          {recipe.name}
        </h3>
        <p className="font-hand text-[1.2rem] leading-none text-wine">
          prepared by {recipe.contributor_name}
        </p>
      </div>
    </Link>
  )
}
