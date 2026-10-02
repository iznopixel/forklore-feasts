import { format } from "date-fns"

const SIX_HOURS = 6 * 60 * 60 * 1000

/** A gathering counts as upcoming until a few hours after it starts. */
export function isUpcoming(startsAt: string, now = Date.now()) {
  return new Date(startsAt).getTime() + SIX_HOURS >= now
}

export const longDate = (iso: string) => format(new Date(iso), "EEEE, MMMM d")
export const shortDate = (iso: string) => format(new Date(iso), "MMM d, yyyy")
export const timeOfDay = (iso: string) => format(new Date(iso), "h:mm a")
export const monthDay = (iso: string) => ({
  month: format(new Date(iso), "MMM"),
  day: format(new Date(iso), "d"),
  weekday: format(new Date(iso), "EEE"),
  year: format(new Date(iso), "yyyy"),
})

export function minutesLabel(min?: number | null) {
  if (!min) return null
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} hr ${m} min` : `${h} hr`
}

/** Recipes linked through dishes, counted once even if several dishes share one. */
export function distinctRecipeCount(dishes: { recipe_id: string | null }[]) {
  return new Set(dishes.map((d) => d.recipe_id).filter(Boolean)).size
}

/** "January 10 at 6:00 PM" */
export const deadlineLabel = (iso: string) => format(new Date(iso), "MMMM d 'at' h:mm a")

/** True when any dish made from this recipe was crowned at a gathering. */
export const isWinningRecipe = (recipe: { dishes?: { is_winner?: boolean }[] }) =>
  !!recipe.dishes?.some((d) => d.is_winner)
