import type { Icon } from "@phosphor-icons/react"
import {
  BowlFoodIcon,
  BowlSteamIcon,
  BreadIcon,
  CakeIcon,
  CarrotIcon,
  CheeseIcon,
  CookieIcon,
  CookingPotIcon,
  ForkKnifeIcon,
  LeafIcon,
  OrangeSliceIcon,
  PepperIcon,
  PlantIcon,
  StarIcon,
  WineIcon,
} from "@phosphor-icons/react"
import type { Event } from "@/lib/types"

/* ---------------------------- Dish categories ---------------------------- */

export const DISH_CATEGORIES = [
  "Starter",
  "Main",
  "Side",
  "Salad",
  "Soup",
  "Bread",
  "Dessert",
  "Drink",
  "Other",
] as const

const CATEGORY_ICONS: [RegExp, Icon][] = [
  [/starter|appetiz|snack|dip|finger/i, CheeseIcon],
  [/soup|stew|chili/i, BowlSteamIcon],
  [/salad|green|veg/i, LeafIcon],
  [/bread|roll|biscuit|bake/i, BreadIcon],
  [/dessert|sweet|cake|pie|cookie/i, CakeIcon],
  [/drink|bever|cocktail|punch/i, WineIcon],
  [/main|entr|casserole|roast/i, CookingPotIcon],
  [/side/i, BowlFoodIcon],
]

export function categoryIcon(category?: string | null): Icon {
  if (!category) return ForkKnifeIcon
  return CATEGORY_ICONS.find(([re]) => re.test(category))?.[1] ?? ForkKnifeIcon
}

/* -------------------------------- Tags -------------------------------- */

/** Dietary tags are worked out from ingredients; see `@/lib/dietary`. */
export function normalizeTag(tag: string) {
  return tag.trim().toLowerCase().replace(/\s+/g, "-")
}

/* ------------------------------ Event posters ----------------------------- */

export interface PosterStyle {
  bg: string
  ink: string
  accent: string
  /** Soft, flat second-pass colour for misprinted display type */
  misprint: string
  glyphs: [Icon, Icon, Icon]
  /** Handwritten tagline on the poster */
  scrawl: string
}

const PALETTES = [
  { bg: "#552829", ink: "#f4eedc", accent: "#e7aead", misprint: "#331617" }, // maroon
  { bg: "#a59b41", ink: "#2c3025", accent: "#f4eedc", misprint: "#7d7530" }, // olive
  { bg: "#2c3025", ink: "#f4eedc", accent: "#d4b04a", misprint: "#14160f" }, // charcoal
  { bg: "#ad8b21", ink: "#2c3025", accent: "#f4eedc", misprint: "#7f6615" }, // mustard
  { bg: "#e7aead", ink: "#2c3025", accent: "#552829", misprint: "#b98483" }, // pink
  { bg: "#bac6ba", ink: "#2c3025", accent: "#552829", misprint: "#8c9c8c" }, // sage
]

const GLYPHS: { match: RegExp; glyphs: PosterStyle["glyphs"]; scrawl: string }[] = [
  { match: /soup|stew|chili|winter|cozy|broth/i, glyphs: [CookingPotIcon, BowlSteamIcon, StarIcon], scrawl: "bring a ladle!" },
  { match: /bread|bake|brunch|toast/i, glyphs: [BreadIcon, CookieIcon, StarIcon], scrawl: "still warm" },
  { match: /harvest|autumn|fall|thanks|orchard/i, glyphs: [LeafIcon, CarrotIcon, StarIcon], scrawl: "from the garden" },
  { match: /summer|picnic|bbq|grill|cookout|porch|tomato/i, glyphs: [OrangeSliceIcon, PepperIcon, StarIcon], scrawl: "blankets & lemonade" },
  { match: /dessert|sweet|pie|cake|cookie/i, glyphs: [CakeIcon, CookieIcon, StarIcon], scrawl: "save room!" },
  { match: /spring|green|garden|herb/i, glyphs: [PlantIcon, LeafIcon, StarIcon], scrawl: "fresh picked" },
]

const FALLBACK_SCRAWL = ["come hungry!", "bring a friend", "all welcome"]

function hash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

/** A deterministic, event-specific look for each gathering's poster. */
export function posterStyle(event: Pick<Event, "slug" | "title" | "theme">): PosterStyle {
  const h = hash(event.slug || event.title)
  const palette = PALETTES[h % PALETTES.length]
  const text = `${event.theme ?? ""} ${event.title}`
  const found = GLYPHS.find((g) => g.match.test(text))
  const fallback: PosterStyle["glyphs"][] = [
    [ForkKnifeIcon, CookingPotIcon, StarIcon],
    [BowlFoodIcon, LeafIcon, StarIcon],
    [CookieIcon, BreadIcon, StarIcon],
  ]
  return {
    ...palette,
    glyphs: found?.glyphs ?? fallback[(h >>> 3) % fallback.length],
    scrawl: found?.scrawl ?? FALLBACK_SCRAWL[(h >>> 5) % FALLBACK_SCRAWL.length],
  }
}
