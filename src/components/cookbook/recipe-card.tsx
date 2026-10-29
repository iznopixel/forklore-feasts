"use client"

import Link from "next/link"
import { CrownStamp } from "@/components/cookbook/ornaments"
import { photoProps } from "@/lib/supabase"
import type { RecipeWithEvents } from "@/lib/types"
import { cn } from "@/lib/utils"

const TILTS = [
  "motion-safe:-rotate-[0.8deg]",
  "motion-safe:rotate-[0.6deg]",
  "motion-safe:-rotate-[0.3deg]",
  "motion-safe:rotate-[1deg]",
]

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
      <div className="flex flex-1 flex-col gap-2 p-5 pt-4">
        <h3 className="font-hand text-[1.85rem] leading-[1.05] font-bold text-foreground group-hover:text-tomato">
          {recipe.name}
        </h3>
        <p className="font-hand text-[1.2rem] leading-none font-bold text-wine">
          prepared by {recipe.contributor_name}
        </p>
      </div>
    </Link>
  )
}
