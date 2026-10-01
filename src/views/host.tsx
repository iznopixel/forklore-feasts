"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { EnvelopeSimpleIcon, PencilSimpleIcon, PlusIcon, SignOutIcon, TrashIcon } from "@phosphor-icons/react"
import { FormField } from "@/components/cookbook/form-field"
import { SectionHeader } from "@/components/cookbook/ornaments"
import { CardSkeletons, EmptyNote, ErrorNote } from "@/components/cookbook/states"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { deleteEvent, fetchMyEvents, fetchHostStatus, requestHostAccess } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { shortDate, timeOfDay } from "@/lib/format"
import { useAsync } from "@/lib/use-async"

function SignInCard() {
  const { sendHostLink } = useAuth()
  const [email, setEmail] = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    const value = email.trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(value)) return setError("Enter your email address.")
    setError(null)
    setSending(true)
    try {
      await sendHostLink(value)
      setSent(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t send the link.")
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="index-card mx-auto mt-8 max-w-md p-6 text-center" style={{ backgroundImage: "none" }}>
        <EnvelopeSimpleIcon weight="duotone" className="mx-auto mb-2 size-10 text-tomato" />
        <p className="font-heading text-xl font-bold">Check your inbox</p>
        <p className="mt-1 text-muted-foreground">
          We sent a sign-in link to <strong>{email.trim()}</strong>. Open it on this device to continue.
        </p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => setSent(false)}>
          Use a different email
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className="index-card mx-auto mt-8 grid max-w-md gap-5 p-6" style={{ backgroundImage: "none" }}>
      <FormField id="host-email" label="Email" required error={error} hint="New here? Same step: we’ll email a one-time link, then you can request host access. No password needed.">
        <Input
          id="host-email"
          type="email"
          autoComplete="email"
          value={email}
          aria-invalid={Boolean(error)}
          onChange={(e) => setEmail(e.target.value)}
        />
      </FormField>
      <Button type="submit" disabled={sending}>
        <EnvelopeSimpleIcon weight="bold" /> {sending ? "Sending…" : "Email me a sign-in link"}
      </Button>
    </form>
  )
}

function RequestCard({ email, onDone }: { email: string | null; onDone: () => void }) {
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    if (!name.trim()) return setError("Tell us your name.")
    setError(null)
    setSending(true)
    try {
      await requestHostAccess(name.trim())
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t send your request.")
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="index-card mx-auto mt-8 grid max-w-md gap-5 p-6" style={{ backgroundImage: "none" }}>
      <p className="font-heading text-xl font-bold">Request host access</p>
      <p className="-mt-3 text-sm text-muted-foreground">
        You’re signed in as {email}. An admin will review your request; once approved you can create gatherings.
      </p>
      <FormField id="host-name" label="Your name" required error={error}>
        <Input id="host-name" value={name} maxLength={100} aria-invalid={Boolean(error)} onChange={(e) => setName(e.target.value)} />
      </FormField>
      <Button type="submit" disabled={sending}>{sending ? "Sending…" : "Request access"}</Button>
    </form>
  )
}

function Dashboard({ userId }: { userId: string }) {
  const { data, error, loading, reload } = useAsync(fetchMyEvents, [])
  const [busy, setBusy] = useState<string | null>(null)
  const mine = (data ?? []).filter((e) => e.host_user_id === userId).sort((a, b) => b.starts_at.localeCompare(a.starts_at))

  async function onDelete(id: string, title: string) {
    if (!window.confirm(`Delete “${title}”? Its dishes will be removed too.`)) return
    setBusy(id)
    try {
      await deleteEvent(id)
      toast.success("Gathering deleted.")
      reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn’t delete that gathering.")
    } finally {
      setBusy(null)
    }
  }

  if (loading) return <CardSkeletons count={2} className="mt-8" />
  if (error) return <ErrorNote message={error} onRetry={reload} />
  if (mine.length === 0) {
    return (
      <EmptyNote
        title="No gatherings yet"
        action={
          <Link href="/host/events/new" className={buttonVariants()}>
            <PlusIcon weight="bold" /> Plan your first gathering
          </Link>
        }
      >
        Gatherings you create show up here, and on the public calendar.
      </EmptyNote>
    )
  }
  return (
    <ul className="mt-8 grid gap-4">
      {mine.map((e) => (
        <li key={e.id} className="paper flex flex-wrap items-center justify-between gap-4 p-4">
          <div>
            <Link href={`/events/${e.slug}`} className="font-heading text-2xl font-bold hover:text-tomato">
              {e.title}
            </Link>
            <p className="text-sm text-muted-foreground">
              {shortDate(e.starts_at)} · {timeOfDay(e.starts_at)} · {e.dishes?.length ?? 0} dishes{!e.is_public && " · unlisted"}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/host/events/${e.slug}/edit`} className={buttonVariants({ variant: "outline", size: "sm" })}>
              <PencilSimpleIcon weight="bold" /> Edit
            </Link>
            <Button variant="outline" size="sm" disabled={busy === e.id} onClick={() => onDelete(e.id, e.title)}>
              <TrashIcon weight="bold" /> Delete
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}

export default function HostPage() {
  const { status, isGuest, userId, email, signOut } = useAuth()
  const signedIn = status === "ready" && !isGuest && userId
  const host = useAsync(async () => (signedIn ? (await fetchHostStatus()).status : "none"), [signedIn, userId])

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <SectionHeader as="h1" kicker="for the people setting the table" title="Host corner" />

      {status === "loading" || (signedIn && host.loading) ? (
        <CardSkeletons count={1} className="mt-8" />
      ) : !signedIn ? (
        <SignInCard />
      ) : host.error ? (
        <ErrorNote message={host.error} onRetry={host.reload} />
      ) : host.data === "none" ? (
        <RequestCard email={email} onDone={host.reload} />
      ) : host.data === "pending" ? (
        <EmptyNote
          title="Request received"
          action={<Button variant="outline" onClick={() => void signOut()}>Sign out</Button>}
        >
          Thanks! {email} is waiting for an admin’s approval. Come back to this page once you’ve been approved.
        </EmptyNote>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Signed in as {email}</p>
            <div className="flex gap-2">
              <Link href="/host/events/new" className={buttonVariants()}>
                <PlusIcon weight="bold" /> New gathering
              </Link>
              <Button variant="outline" onClick={() => void signOut()}>
                <SignOutIcon weight="bold" /> Sign out
              </Button>
            </div>
          </div>
          <Dashboard userId={userId} />
        </>
      )}
    </div>
  )
}
