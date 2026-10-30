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
 * Stands in for a photo when a card without one is stretched to match a taller neighbour in its row.
 * The wrapper takes only the leftover height (zero when the card isn't stretched, so it costs no layout),
 * and the picture appears only once there's enough room for it to read as a photo.
 */
function DishPlaceholder({ recipe }: { recipe: RecipeWithEvents }) {
  const style = posterStyle({ slug: recipe.slug, title: recipe.name, theme: null })
  const Glyph = categoryIcon(recipe.category)
  return (
    <div className="relative min-h-0 flex-1 [container-type:size]" aria-hidden="true">
      <div
        className="grain absolute inset-x-3 top-3 bottom-0 hidden flex-col items-center justify-center gap-2 overflow-hidden border border-border [@container(min-height:7rem)]:flex"
        style={{ background: style.bg, color: style.ink }}
      >
        <Glyph weight="fill" className="size-14 opacity-80" />
        {recipe.category && (
          <span className="text-[0.65rem] font-bold tracking-widest uppercase opacity-80">{recipe.category}</span>
        )}
      </div>
    </div>
  )
}

/** A recipe written out by hand on an index card. */
export function RecipeCard({ recipe, index = 0 }: { recipe: RecipeWithEvents; index?: number }) {
  const image = photoProps(recipe.image_path, "(min-width: 640px) 20rem, 90vw")
  const won = recipe.dishes.some((d) => d.events?.winner_recipe_id === recipe.id)

  return (
    <Link
      href={`/recipes/${recipe.slug}`}
      className={cn(
        "index-card group relative flex min-w-0 flex-col transition-transform duration-200 outline-none hover:rotate-0 focus-visible:ring-3 focus-visible:ring-ring/40 motion-reduce:transition-none",
        TILTS[index % TILTS.length]
      )}
    >
      {won && <CrownStamp className="absolute -right-3 -bottom-4 z-10" />}
      {image && (
        <div className="relative m-3 mb-0 aspect-[4/3] overflow-hidden border border-border bg-muted">
          <img {...image} alt="" loading="lazy" className="size-full max-w-full object-cover sepia-[0.15]" />
        </div>
      )}
      {!image && <DishPlaceholder recipe={recipe} />}
      <div className="flex flex-col gap-2 p-5 pt-4">
        <h3 className="font-hand text-[1.85rem] leading-[1.05] font-bold text-foreground group-hover:text-tomato">
          {recipe.name}
        </h3>
        <p className="font-hand text-[1.2rem] leading-none text-wine">
          prepared by {recipe.contributor_name}
        </p>
      </div>
    </Link>
  )
}
