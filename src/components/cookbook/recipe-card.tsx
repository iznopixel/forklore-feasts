"use client"

import Link from "next/link"
import { Crown } from "@/components/cookbook/ornaments"
import { isWinningRecipe } from "@/lib/format"
import { mediaUrl } from "@/lib/supabase"
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
  const image = mediaUrl(recipe.image_path)
  const winner = isWinningRecipe(recipe)

  return (
    <Link
      href={`/recipes/${recipe.slug}`}
      className={cn(
        "index-card group relative flex flex-col transition-transform duration-200 outline-none hover:rotate-0 focus-visible:ring-3 focus-visible:ring-ring/40 motion-reduce:transition-none",
        TILTS[index % TILTS.length]
      )}
    >
      {winner && (
        <span
          role="img"
          aria-label="Voted a winner"
          title="Voted a winner"
          className="absolute -top-3 -right-2 z-10 grid size-9 rotate-6 place-items-center rounded-full border border-ochre/70 bg-[#f8f1e1] text-ochre shadow-[0_2px_5px_rgb(60_40_20/0.25)]"
        >
          <Crown className="size-5" />
        </span>
      )}
      {image && (
        <div className="relative m-3 mb-0 aspect-[4/3] overflow-hidden border border-border bg-muted">
          <img src={image} alt="" loading="lazy" className="size-full object-cover sepia-[0.15]" />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-5 pt-4">
        <h3 className="font-hand text-[2.1rem] leading-[1.05] text-foreground group-hover:text-tomato">
          {recipe.name}
        </h3>
        <p className="font-hand text-[1.35rem] leading-none text-wine">
          prepared by {recipe.contributor_name}
        </p>
      </div>
    </Link>
  )
}
