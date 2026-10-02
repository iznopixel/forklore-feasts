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
  /** Guests vote on the theme until `theme_voting_deadline`; see ThemeVoting for what the page shows. */
  theme_voting_enabled: boolean
  theme_voting_deadline: string | null
  theme_voting_status: ThemeVotingStatus
  theme_winner_option_id: string | null
  created_at: string
  updated_at: string
}

export type ThemeVotingStatus = "open" | "closed" | "finalized"

export interface ThemeOption {
  id: string
  position: number
  name: string
  description: string | null
  /** Only present when the viewer may see totals (the host, or anyone once voting has closed). */
  votes?: number
  /** After the deadline: this option has the most votes and shares the lead with another (or nobody voted). */
  tied?: boolean
}

/** Everything the event page needs for theme voting, computed by the database for this viewer. */
export interface ThemeVoting {
  status: ThemeVotingStatus
  deadline: string
  is_host: boolean
  options: ThemeOption[]
  winner_option_id: string | null
  /** The option the current guest session last voted for. */
  my_vote_option_id: string | null
  total_votes: number | null
}

export interface ThemeOptionInput {
  /** Existing option id, so its votes survive an edit. */
  id?: string
  name: string
  description: string | null
}

export interface ThemeVotingInput {
  enabled: boolean
  /** ISO timestamp; required when enabled */
  deadline: string | null
  options: ThemeOptionInput[]
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
  /** Crowned by the host as a winner of the gathering */
  is_winner: boolean
  owner_user_id: string
  created_at: string
  updated_at: string
}

/** Event -> many Dishes -> optional Recipe */
export type DishWithRecipe = Dish & { recipes: Recipe | null }
export type EventWithDishes = Event & { dishes: DishWithRecipe[]; theme_voting: ThemeVoting | null }

/** Lightweight event summary used on listing cards. */
export type EventSummary = Event & {
  dishes: Pick<Dish, "id" | "recipe_id">[]
}

export type RecipeEventRef = Pick<Event, "id" | "title" | "slug" | "starts_at">
export type RecipeWithEvents = Recipe & {
  dishes: { id: string; event_id: string; is_winner: boolean; events: RecipeEventRef | null }[]
}

export interface RecipeInput {
  name: string
  contributor_name: string
  description: string | null
  category: string | null
  ingredients: string[]
  instructions: string[]
  tags: string[]
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
  /** Omit to leave voting as it is (e.g. once it has closed). */
  theme_voting?: ThemeVotingInput
}
