"use client"

import { useEffect, useState, type FormEvent } from "react"
import { toast } from "sonner"
import { CheckCircleIcon, ForkKnifeIcon } from "@phosphor-icons/react"
import { FormField } from "@/components/cookbook/form-field"
import { GuestNotice } from "@/components/cookbook/guest-notice"
import { Annotation, Sparkle, Squiggle } from "@/components/cookbook/ornaments"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { castThemeVote, chooseThemeWinner } from "@/lib/api"
import { deadlineLabel } from "@/lib/format"
import type { ThemeOption, ThemeVoting } from "@/lib/types"
import { getSavedName, saveName, useRequireUser } from "@/lib/use-writer"
import { cn } from "@/lib/utils"

const TILT = ["-rotate-[1.2deg]", "rotate-[0.9deg]", "-rotate-[0.6deg]"]

/** One theme, set out like a little menu card. */
function MenuCard({
  option,
  index,
  className,
  children,
}: {
  option: ThemeOption
  index: number
  className?: string
  children?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "relative flex h-full flex-col items-center bg-[#fdf8ec] px-6 pt-7 pb-6 text-center text-ink shadow-[0_1px_2px_rgb(60_40_20/0.25),0_12px_24px_-10px_rgb(60_40_20/0.35)] transition-all dark:bg-card",
        TILT[index % TILT.length],
        className
      )}
    >
      <span aria-hidden="true" className="pointer-events-none absolute inset-2 border border-dashed border-tomato/35" />
      <Sparkle className="size-3.5 text-ochre" />
      <h3 className="display mt-3 text-[1.7rem] leading-[1.05] break-words">{option.name}</h3>
      {option.description && (
        <p className="mt-3 font-heading text-[0.95rem] leading-snug text-muted-foreground italic">{option.description}</p>
      )}
      {children}
    </div>
  )
}

/** "3 votes" with a little bar, once totals may be shown. */
function Tally({ option, total, lead }: { option: ThemeOption; total: number; lead?: boolean }) {
  if (option.votes === undefined) return null
  const pct = total ? Math.round((option.votes / total) * 100) : 0
  return (
    <div className="mt-auto w-full pt-5">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
        <div className={cn("h-full rounded-full", lead ? "bg-moss" : "bg-tomato/50")} style={{ width: `${pct}%` }} />
      </div>
      <p className="font-hand mt-1.5 text-xl leading-none text-tomato">
        {option.votes} {option.votes === 1 ? "vote" : "votes"}
      </p>
    </div>
  )
}

function Panel({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <section aria-label={label} className="index-card relative p-6 sm:p-10" style={{ backgroundImage: "none" }}>
      <div className="tape -top-3 left-10 -rotate-3" aria-hidden="true" />
      {children}
    </section>
  )
}

function Heading({ kicker, title }: { kicker: string; title: string }) {
  return (
    <header className="mb-8 text-center">
      <Annotation className="mb-2 block" rotate={-2}>{kicker}</Annotation>
      <h2 className="display text-[clamp(2rem,5vw,3.25rem)] text-foreground">{title}</h2>
      <Squiggle className="mx-auto mt-3 text-tomato" />
    </header>
  )
}

const columns = (n: number) => (n >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 sm:mx-auto sm:max-w-3xl")

export function ThemeVote({
  eventId,
  voting,
  onChanged,
}: {
  eventId: string
  voting: ThemeVoting
  /** Called after a vote or a host's pick, so the page can reload. */
  onChanged: () => void
}) {
  if (voting.status === "open") return <OpenVote eventId={eventId} voting={voting} onChanged={onChanged} />
  if (voting.status === "closed") return <TieBreak eventId={eventId} voting={voting} onChanged={onChanged} />
  return <Winner voting={voting} />
}

function OpenVote({ eventId, voting, onChanged }: { eventId: string; voting: ThemeVoting; onChanged: () => void }) {
  const requireUser = useRequireUser()
  const [choice, setChoice] = useState<string | null>(voting.my_vote_option_id)
  const [name, setName] = useState("")
  const [errors, setErrors] = useState<{ choice?: string; name?: string }>({})
  const [saving, setSaving] = useState(false)
  const voted = voting.options.find((o) => o.id === voting.my_vote_option_id)
  const total = voting.total_votes ?? 0
  const leading = Math.max(0, ...voting.options.map((o) => o.votes ?? 0))

  useEffect(() => setName(getSavedName()), [])
  useEffect(() => setChoice(voting.my_vote_option_id), [voting.my_vote_option_id])

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    const next = {
      choice: choice ? undefined : "Pick a theme first.",
      name: name.trim() ? undefined : "Add your first name so we know who voted.",
    }
    setErrors(next)
    if (next.choice || next.name || !choice) return
    setSaving(true)
    try {
      if (!(await requireUser())) return
      saveName(name.trim())
      await castThemeVote(eventId, choice, name.trim())
      toast.success(voted ? "Vote changed." : "Vote cast. Thanks for pulling up a chair!")
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn’t save your vote.")
      onChanged() // the deadline may just have passed
    } finally {
      setSaving(false)
    }
  }

  return (
    <Panel label="Vote on the theme">
      <Heading kicker="pull up a chair" title="What should we feast on?" />
      <div className="mb-6 empty:hidden">
        <GuestNotice />
      </div>
      <form onSubmit={onSubmit} noValidate>
        <fieldset>
          <legend className="sr-only">Vote on the theme</legend>
          <div className={cn("grid gap-6", columns(voting.options.length))}>
            {voting.options.map((o, i) => {
              const picked = choice === o.id
              return (
                <label key={o.id} className="group block cursor-pointer">
                  <input
                    type="radio"
                    name="theme-vote"
                    value={o.id}
                    checked={picked}
                    onChange={() => {
                      setChoice(o.id)
                      setErrors((e) => ({ ...e, choice: undefined }))
                    }}
                    className="peer sr-only"
                  />
                  <MenuCard
                    option={o}
                    index={i}
                    className={cn(
                      "outline-offset-4 group-hover:-translate-y-1 peer-focus-visible:outline-2 peer-focus-visible:outline-ring",
                      picked && "rotate-0 -translate-y-1 ring-2 ring-tomato shadow-[0_18px_30px_-12px_rgb(60_40_20/0.45)]"
                    )}
                  >
                    {picked && (
                      <CheckCircleIcon weight="fill" aria-hidden="true" className="absolute -top-3 -right-3 size-9 rotate-6 text-tomato" />
                    )}
                    <Tally option={o} total={total} lead={(o.votes ?? 0) === leading && leading > 0} />
                    {voting.my_vote_option_id === o.id && (
                      <Annotation className="mt-3 text-tomato" rotate={-2}>your vote</Annotation>
                    )}
                  </MenuCard>
                </label>
              )
            })}
          </div>
          {errors.choice && <p role="alert" className="mt-4 text-center text-sm font-semibold text-destructive">{errors.choice}</p>}
        </fieldset>

        <div className="mx-auto mt-10 flex max-w-xl flex-wrap items-end justify-center gap-4">
          <FormField id="vote-name" label="First name" required error={errors.name} className="w-full sm:w-64">
            <Input
              id="vote-name"
              value={name}
              maxLength={40}
              autoComplete="given-name"
              placeholder="Isabel"
              aria-invalid={Boolean(errors.name)}
              onChange={(e) => setName(e.target.value)}
            />
          </FormField>
          <Button type="submit" size="lg" disabled={saving} className="btn-letterpress h-11 px-6 text-base">
            <ForkKnifeIcon weight="fill" /> {saving ? "Counting…" : voted ? "Change my vote" : "Cast my vote"}
          </Button>
        </div>

        <div className="mt-6 space-y-1 text-center">
          {voted && (
            <p className="font-semibold">
              You voted for <span className="text-tomato">{voted.name}</span>. Changed your mind? Pick again and recast.
            </p>
          )}
          <p className="text-muted-foreground">Voting closes {deadlineLabel(voting.deadline)}.</p>
          <p className="font-hand text-xl text-muted-foreground">
            {voting.is_host
              ? `Only you can see the tally for now (${total} ${total === 1 ? "vote" : "votes"} so far).`
              : "The tally stays secret until voting closes."}
          </p>
        </div>
      </form>
    </Panel>
  )
}

/** Voting has closed with no single winner (a tie, or nobody voted): the host decides. */
function TieBreak({ eventId, voting, onChanged }: { eventId: string; voting: ThemeVoting; onChanged: () => void }) {
  const [pick, setPick] = useState<ThemeOption | null>(null)
  const [saving, setSaving] = useState(false)
  const total = voting.total_votes ?? 0
  const voted = voting.options.find((o) => o.id === voting.my_vote_option_id)

  async function confirm() {
    if (!pick) return
    setSaving(true)
    try {
      await chooseThemeWinner(eventId, pick.id)
      toast.success(`${pick.name} it is.`)
      setPick(null)
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn’t save the theme.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Panel label="Theme vote result">
      <Heading kicker="the votes are in" title={total === 0 ? "Nobody voted!" : "It’s a tie!"} />
      <div className={cn("grid gap-6", columns(voting.options.length))}>
        {voting.options.map((o, i) => (
          <MenuCard key={o.id} option={o} index={i} className={cn(!o.tied && "opacity-60")}>
            <Tally option={o} total={total} lead={o.tied} />
            {voting.is_host && o.tied && (
              <Button onClick={() => setPick(o)} className="btn-letterpress mt-4">Make it our theme</Button>
            )}
          </MenuCard>
        ))}
      </div>
      <p className="mt-8 text-center">
        {voting.is_host ? (
          <Annotation className="text-tomato" rotate={-1}>
            {total === 0 ? "Choose the theme yourself, host." : "You’re the tiebreaker. Choose one of the tied themes."}
          </Annotation>
        ) : (
          <Annotation className="text-tomato" rotate={-1}>The host will pick the final theme.</Annotation>
        )}
      </p>
      {voted && <p className="mt-2 text-center text-muted-foreground">You voted for {voted.name}.</p>}

      <AlertDialog open={!!pick} onOpenChange={(open) => !open && setPick(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Make {pick?.name} the theme?</AlertDialogTitle>
            <AlertDialogDescription>This is final. Everyone will see it as the theme for the gathering.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not yet</AlertDialogCancel>
            <AlertDialogAction disabled={saving} onClick={() => void confirm()}>Make it the theme</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Panel>
  )
}

/** The winning theme, front and centre, with the final results kept underneath. */
function Winner({ voting }: { voting: ThemeVoting }) {
  const winner = voting.options.find((o) => o.id === voting.winner_option_id)
  const total = voting.total_votes ?? 0
  const voted = voting.options.find((o) => o.id === voting.my_vote_option_id)
  if (!winner) return null
  const showResults = voting.options.some((o) => o.votes !== undefined)
  return (
    <Panel label="Theme">
      <div className="text-center">
        <Annotation className="mb-3 block text-tomato" rotate={-2}>the table has spoken</Annotation>
        <p className="text-[0.7rem] font-bold tracking-[0.3em] text-tomato uppercase">Our theme</p>
        <h2 className="display misprint mt-3 text-[clamp(2.75rem,8vw,5.5rem)] break-words text-foreground">{winner.name}</h2>
        <Squiggle className="mx-auto mt-4 text-tomato" />
        {winner.description && (
          <p className="mx-auto mt-4 max-w-xl font-heading text-xl leading-snug text-muted-foreground italic">{winner.description}</p>
        )}
      </div>

      {showResults && (
        <div className="mx-auto mt-10 max-w-xl border-t border-dashed border-foreground/25 pt-6">
          <p className="text-[0.65rem] font-bold tracking-[0.25em] text-tomato uppercase">
            How the vote went · {total} {total === 1 ? "vote" : "votes"}
          </p>
          <ul className="mt-4 grid gap-4">
            {voting.options.map((o) => {
              const pct = total ? Math.round(((o.votes ?? 0) / total) * 100) : 0
              const won = o.id === winner.id
              return (
                <li key={o.id}>
                  <div className="flex items-baseline justify-between gap-4">
                    <span className={cn("font-heading text-lg", won ? "font-bold" : "text-muted-foreground")}>
                      {o.name}
                      {won && <CheckCircleIcon weight="fill" aria-label="Winner" className="ml-1.5 inline size-4 align-[-0.1em] text-moss" />}
                    </span>
                    <span className="font-hand text-xl text-tomato">{o.votes ?? 0}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-foreground/10">
                    <div className={cn("h-full rounded-full", won ? "bg-moss" : "bg-tomato/40")} style={{ width: `${pct}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
          {voted && <p className="mt-5 text-muted-foreground">You voted for {voted.name}.</p>}
        </div>
      )}
    </Panel>
  )
}
