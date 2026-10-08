export interface Event {
  id: string
  title: string
  slug: string
  theme: string | null
  description: string | null
  starts_at: string
  cover_image_path: string | null
  host_user_id: string | null
  /** false = unlisted: reachable by link, hidden from listings */
  is_public: boolean
  /** Recipe the host crowned as the winner of this gathering */
  winner_recipe_id: string | null
  created_at: string
  updated_at: string
}

export interface Recipe {
  id: string
  name: string
  slug: string
  contributor_name: string
  description: string | null
  image_path: string | null
  ingredients: string[]
  instructions: string[]
  prep_time_minutes: number | null
  cook_time_minutes: number | null
  servings: number | null
  category: string | null
  tags: string[]
  source_url: string | null
  notes: string | null
  owner_user_id: string
  created_at: string
  updated_at: string
}

export interface Dish {
  id: string
  event_id: string
  contributor_name: string
  name: string
  category: string | null
  note: string | null
  recipe_id: string | null
  owner_user_id: string
  created_at: string
  updated_at: string
}

/** Event -> many Dishes -> optional Recipe */
export type DishWithRecipe = Dish & { recipes: Recipe | null }
export type EventWithDishes = Event & { dishes: DishWithRecipe[] }

/** Lightweight event summary used on listing cards. */
export type EventSummary = Event & {
  dishes: Pick<Dish, "id" | "recipe_id">[]
}

export type RecipeEventRef = Pick<Event, "id" | "title" | "slug" | "starts_at" | "winner_recipe_id">
export type RecipeWithEvents = Recipe & {
  dishes: { id: string; event_id: string; events: RecipeEventRef | null }[]
}

export interface RecipeInput {
  name: string
  contributor_name: string
  description: string | null
  category: string | null
  ingredients: string[]
  instructions: string[]
  prep_time_minutes: number | null
  cook_time_minutes: number | null
  servings: number | null
  source_url: string | null
  notes: string | null
  image_path?: string | null
}

export interface DishInput {
  event_id: string
  contributor_name: string
  name: string
  category: string | null
  note: string | null
  recipe_id?: string | null
}

export interface EventInput {
  title: string
  theme: string | null
  description: string | null
  /** ISO timestamp */
  starts_at: string
  is_public: boolean
  cover_image_path?: string | null
}
