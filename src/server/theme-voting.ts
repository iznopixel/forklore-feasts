import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import { check } from "@/server/supabase"
import type { Event, ThemeVoting } from "@/lib/types"

type VotingFields = Pick<Event, "id" | "theme" | "theme_voting_enabled" | "theme_voting_deadline" | "theme_voting_status" | "theme_winner_option_id">

/** What this viewer sees of an event's theme voting (null when voting is off). Also settles it if the deadline has passed. */
export async function loadThemeVoting(sb: SupabaseClient, eventId: string) {
  return check(await sb.rpc("theme_voting_view", { p_event_id: eventId })) as ThemeVoting | null
}

/**
 * Voting closes by itself at its deadline, with no scheduler: the first look afterwards settles it in the
 * database. This mirrors that onto an event row that was read just before, so the page shows the new theme.
 */
export function applySettled(event: VotingFields, view: ThemeVoting | null) {
  if (view?.status !== "finalized" || event.theme_voting_status === "finalized") return
  const winner = view.options.find((o) => o.id === view.winner_option_id)
  event.theme_voting_status = "finalized"
  event.theme_winner_option_id = view.winner_option_id
  if (winner) event.theme = winner.name
}

/** Events whose deadline has passed but haven't been settled yet. */
export const needsSettling = (e: VotingFields, now = Date.now()) =>
  e.theme_voting_enabled &&
  e.theme_voting_status !== "finalized" &&
  e.theme_voting_deadline !== null &&
  new Date(e.theme_voting_deadline).getTime() <= now
