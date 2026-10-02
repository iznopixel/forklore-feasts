"use client"

import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { KeyIcon } from "@phosphor-icons/react"
import { FormField } from "@/components/cookbook/form-field"
import { SectionHeader } from "@/components/cookbook/ornaments"
import { CardSkeletons, EmptyNote } from "@/components/cookbook/states"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth"

/** Where the emailed reset link lands: Supabase signs the host in, then they choose a new password. */
export default function HostResetPage() {
  const router = useRouter()
  const { status, isGuest, userId, email, setPassword } = useAuth()
  const [value, setValue] = useState("")
  const [again, setAgain] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)

  // An expired or reused link comes back as #error_description=… instead of a session.
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""))
    const desc = hash.get("error_description")
    if (desc) setLinkError(desc.replace(/\+/g, " "))
  }, [])

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    if (value.length < 8) return setError("Use at least 8 characters.")
    if (value !== again) return setError("Those two don’t match.")
    setError(null)
    setSaving(true)
    try {
      await setPassword(value)
      toast.success("Password saved. You’re signed in.")
      router.replace("/host")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t save that password.")
      setSaving(false)
    }
  }

  const signedIn = status === "ready" && !isGuest && Boolean(userId)

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <SectionHeader as="h1" kicker="a fresh start" title="New password" />
      {status === "loading" ? (
        <CardSkeletons count={1} className="mt-8" />
      ) : !signedIn ? (
        <EmptyNote
          title="This link has expired"
          action={<Link href="/host" className={buttonVariants()}>Back to host sign-in</Link>}
        >
          {linkError ?? "Reset links work once and don’t last long."} Ask for a new one with “Forgot your password?”
        </EmptyNote>
      ) : (
        <form onSubmit={onSubmit} noValidate className="index-card mx-auto mt-8 grid max-w-md gap-5 p-6" style={{ backgroundImage: "none" }}>
          <p className="text-sm text-muted-foreground">Choosing a password for {email}.</p>
          <FormField id="reset-password" label="New password" required hint="At least 8 characters.">
            <Input id="reset-password" type="password" autoComplete="new-password" value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
          </FormField>
          <FormField id="reset-again" label="Once more" required error={error}>
            <Input id="reset-again" type="password" autoComplete="new-password" value={again} aria-invalid={Boolean(error)} onChange={(e) => setAgain(e.target.value)} />
          </FormField>
          <Button type="submit" disabled={saving}>
            <KeyIcon weight="bold" /> {saving ? "Saving…" : "Save password"}
          </Button>
        </form>
      )}
    </div>
  )
}
