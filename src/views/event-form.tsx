"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { format } from "date-fns"
import { toast } from "sonner"
import { ArrowLeftIcon, CameraIcon, PlusIcon, XIcon } from "@phosphor-icons/react"
import { FormField } from "@/components/cookbook/form-field"
import { SectionHeader } from "@/components/cookbook/ornaments"
import { CardSkeletons, EmptyNote, ErrorNote } from "@/components/cookbook/states"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { createEvent, fetchEventBySlug, fetchHostStatus, updateEvent, uploadImage } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { mediaUrl } from "@/lib/supabase"
import { useAsync } from "@/lib/use-async"
import { cn } from "@/lib/utils"

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const MAX_THEMES = 3
const MIN_THEMES = 2

interface ThemeDraft {
  id?: string
  name: string
  description: string
}
const blankThemes = (): ThemeDraft[] => [{ name: "", description: "" }, { name: "", description: "" }]

export default function EventFormPage() {
  const { slug } = useParams<{ slug?: string }>()
  const editing = Boolean(slug)
  const router = useRouter()
  const { status, isGuest, userId } = useAuth()
  const signedIn = status === "ready" && !isGuest && Boolean(userId)

  const host = useAsync(async () => (signedIn ? (await fetchHostStatus()).isHost : false), [signedIn, userId])
  const existing = useAsync(async () => (slug ? fetchEventBySlug(slug) : null), [slug])

  const [title, setTitle] = useState("")
  const [theme, setTheme] = useState("")
  const [description, setDescription] = useState("")
  const [startsAt, setStartsAt] = useState("")
  const [isPublic, setIsPublic] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [keepImage, setKeepImage] = useState(true)
  const [voting, setVoting] = useState(false)
  const [themes, setThemes] = useState<ThemeDraft[]>(blankThemes)
  const [deadline, setDeadline] = useState("")
  const [errors, setErrors] = useState<{ title?: string; starts?: string; image?: string; themes?: string; deadline?: string }>({})
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const hydrated = useRef(false)

  useEffect(() => {
    const e = existing.data
    if (!e || hydrated.current) return
    hydrated.current = true
    setTitle(e.title)
    setTheme(e.theme ?? "")
    setDescription(e.description ?? "")
    setStartsAt(format(new Date(e.starts_at), "yyyy-MM-dd'T'HH:mm"))
    setIsPublic(e.is_public)
    if (e.theme_voting_enabled && e.theme_voting_deadline) {
      setVoting(true)
      setDeadline(format(new Date(e.theme_voting_deadline), "yyyy-MM-dd'T'HH:mm"))
      const saved = e.theme_voting?.options ?? []
      if (saved.length) setThemes(saved.map((o) => ({ id: o.id, name: o.name, description: o.description ?? "" })))
    }
  }, [existing.data])

  // Once the deadline has passed the options and deadline are locked (the votes are the record).
  const votingLocked = Boolean(existing.data?.theme_voting && existing.data.theme_voting.status !== "open")

  const setThemeDraft = (i: number, patch: Partial<ThemeDraft>) =>
    setThemes((cur) => cur.map((t, j) => (j === i ? { ...t, ...patch } : t)))

  useEffect(() => {
    if (!file) return setPreview(null)
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const shownImage = preview ?? (editing && keepImage ? mediaUrl(existing.data?.cover_image_path) : null)

  function onPickFile(f: File | null) {
    if (!f) return
    if (!f.type.startsWith("image/")) return setErrors((e) => ({ ...e, image: "Please choose an image file." }))
    if (f.size > MAX_IMAGE_BYTES) return setErrors((e) => ({ ...e, image: "That photo is over 5 MB — try a smaller one." }))
    setErrors((e) => ({ ...e, image: undefined }))
    setFile(f)
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    const found: typeof errors = {}
    if (!title.trim()) found.title = "Give the gathering a title."
    if (!startsAt || Number.isNaN(new Date(startsAt).getTime())) found.starts = "Pick a date and time."
    if (voting && !votingLocked) {
      const d = new Date(deadline)
      if (!deadline || Number.isNaN(d.getTime())) found.deadline = "Pick when voting closes."
      else if (d.getTime() <= Date.now()) found.deadline = "That’s already past. Pick a time ahead."
      else if (!found.starts && d.getTime() > new Date(startsAt).getTime()) found.deadline = "Voting should close before the gathering starts."
      if (themes.some((t) => !t.name.trim())) found.themes = "Give every theme a name, or remove the extra one."
    }
    setErrors((cur) => ({ image: cur.image, ...found }))
    if (Object.keys(found).length) {
      toast.error("A few things need your attention.")
      return
    }
    setSaving(true)
    try {
      let cover_image_path: string | null | undefined = undefined
      if (file) cover_image_path = await uploadImage(file)
      else if (editing && !keepImage) cover_image_path = null
      const input = {
        title,
        theme: theme.trim() || null,
        description: description.trim() || null,
        starts_at: new Date(startsAt).toISOString(),
        is_public: isPublic,
        ...(cover_image_path !== undefined ? { cover_image_path } : {}),
        ...(votingLocked
          ? {}
          : {
              theme_voting: {
                enabled: voting,
                deadline: voting ? new Date(deadline).toISOString() : null,
                options: voting ? themes.map((t) => ({ id: t.id, name: t.name.trim(), description: t.description.trim() || null })) : [],
              },
            }),
      }
      const saved = editing && existing.data ? await updateEvent(existing.data.id, input) : await createEvent(input)
      toast.success(editing ? "Gathering updated." : "Gathering created.")
      router.push(`/events/${saved.slug}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn’t save the gathering.")
      setSaving(false)
    }
  }

  const back = (
    <Link href="/host" className="inline-flex items-center gap-2 text-sm font-bold tracking-widest text-wine uppercase hover:underline">
      <ArrowLeftIcon weight="bold" /> Host corner
    </Link>
  )

  let gate: React.ReactNode = null
  if (status === "loading" || (signedIn && host.loading) || (editing && existing.loading)) gate = <CardSkeletons count={1} className="mt-8" />
  else if (!signedIn || host.data === false)
    gate = (
      <EmptyNote title="Hosts only" action={<Link href="/host" className={buttonVariants()}>Go to host sign-in</Link>}>
        Sign in with your host email to manage gatherings.
      </EmptyNote>
    )
  else if (host.error || existing.error) gate = <ErrorNote message={(host.error ?? existing.error)!} />
  else if (editing && !existing.data) gate = <EmptyNote title="Gathering not found" />
  else if (editing && existing.data?.host_user_id !== userId)
    gate = <EmptyNote title="Not your gathering">You can only edit gatherings you host.</EmptyNote>

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      {back}
      <div className="mt-6">
        <SectionHeader as="h1" kicker={editing ? "touch it up" : "set a date"} title={editing ? "Edit gathering" : "New gathering"} />
      </div>
      {gate ?? (
        <form onSubmit={onSubmit} noValidate className="index-card relative mt-6 grid gap-6 p-5 sm:p-8" style={{ backgroundImage: "none" }}>
          <FormField id="ef-title" label="Title" required error={errors.title}>
            <Input id="ef-title" value={title} maxLength={120} aria-invalid={Boolean(errors.title)} onChange={(e) => setTitle(e.target.value)} />
          </FormField>
          <FormField
            id="ef-theme"
            label="Theme"
            hint={
              voting
                ? "Leave this blank if you like. The winning theme from the vote fills it in."
                : "A short tagline, like “Cozy pots & ladles”."
            }
          >
            <Input id="ef-theme" value={theme} maxLength={120} onChange={(e) => setTheme(e.target.value)} />
          </FormField>
          <FormField id="ef-start" label="Date & time" required error={errors.starts}>
            <Input id="ef-start" type="datetime-local" value={startsAt} aria-invalid={Boolean(errors.starts)} onChange={(e) => setStartsAt(e.target.value)} />
          </FormField>
          <FormField id="ef-desc" label="Description">
            <Textarea id="ef-desc" rows={5} value={description} maxLength={2000} onChange={(e) => setDescription(e.target.value)} />
          </FormField>

          <fieldset className="grid gap-4 border border-dashed border-tomato/40 bg-[#fdf8ec]/60 p-4 sm:p-5 dark:bg-card/40">
            <legend className="px-2 text-[0.8rem] font-bold tracking-[0.1em] uppercase">Theme voting</legend>
            <label className="flex cursor-pointer items-start gap-3">
              <Switch
                checked={voting}
                disabled={votingLocked}
                onCheckedChange={setVoting}
                aria-label="Allow guests to vote on the theme"
                className="mt-1"
              />
              <span>
                <span className="block font-semibold">Allow guests to vote on the theme</span>
                <span className="block text-sm text-muted-foreground">
                  Offer a few themes and let everyone pick. The winner becomes the theme when voting closes.
                </span>
              </span>
            </label>

            {votingLocked && (
              <p className="font-hand text-xl text-tomato">
                Voting has closed, so the themes and deadline are locked in.
              </p>
            )}

            {voting && !votingLocked && (
              <div className="grid gap-5">
                <ol className="grid gap-4">
                  {themes.map((t, i) => (
                    <li key={t.id ?? i} className="relative grid gap-3 border border-border bg-paper p-4 sm:grid-cols-2">
                      <FormField id={`ef-theme-name-${i}`} label={`Theme ${i + 1}`} required>
                        <Input
                          id={`ef-theme-name-${i}`}
                          value={t.name}
                          maxLength={60}
                          placeholder={["Pie Party", "Dumpling Day", "Brunch for Dinner"][i]}
                          onChange={(e) => setThemeDraft(i, { name: e.target.value })}
                        />
                      </FormField>
                      <FormField id={`ef-theme-desc-${i}`} label="A line about it">
                        <Input
                          id={`ef-theme-desc-${i}`}
                          value={t.description}
                          maxLength={140}
                          placeholder="Sweet, savory, everything in a crust"
                          onChange={(e) => setThemeDraft(i, { description: e.target.value })}
                        />
                      </FormField>
                      {themes.length > MIN_THEMES && (
                        <button
                          type="button"
                          onClick={() => setThemes((cur) => cur.filter((_, j) => j !== i))}
                          className="absolute -top-2 -right-2 grid size-7 place-items-center rounded-full border border-wine bg-paper text-wine"
                          aria-label={`Remove theme ${i + 1}`}
                        >
                          <XIcon weight="bold" className="size-4" />
                        </button>
                      )}
                    </li>
                  ))}
                </ol>
                {errors.themes && <p role="alert" className="text-sm font-semibold text-destructive">{errors.themes}</p>}
                {themes.length < MAX_THEMES && (
                  <div>
                    <Button type="button" variant="outline" onClick={() => setThemes((cur) => [...cur, { name: "", description: "" }])}>
                      <PlusIcon weight="bold" /> Add a third theme
                    </Button>
                  </div>
                )}
                <FormField id="ef-deadline" label="Voting closes" required error={errors.deadline} hint="Before the gathering starts. After this, the top theme is chosen. If it’s a tie, you’ll pick.">
                  <Input id="ef-deadline" type="datetime-local" value={deadline} aria-invalid={Boolean(errors.deadline)} onChange={(e) => setDeadline(e.target.value)} />
                </FormField>
              </div>
            )}
          </fieldset>

          <fieldset className="grid gap-2">
            <legend className="mb-1 text-[0.8rem] font-bold tracking-[0.1em] uppercase">Event visibility</legend>
            {[
              { value: true, label: "Public", hint: "Listed on Forklore Feasts" },
              { value: false, label: "Private / Unlisted", hint: "Only people with the link can find this event" },
            ].map((o) => (
              <label key={String(o.value)} className="flex cursor-pointer items-start gap-3">
                <input
                  type="radio"
                  name="ef-visibility"
                  className="mt-1.5 accent-tomato"
                  checked={isPublic === o.value}
                  onChange={() => setIsPublic(o.value)}
                />
                <span>
                  <span className="block font-semibold">{o.label}</span>
                  <span className="block text-sm text-muted-foreground">{o.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <div className="grid gap-2">
            <p className="text-[0.8rem] font-bold tracking-[0.1em] uppercase">
              Cover photo <span className="font-hand text-lg font-normal tracking-normal text-muted-foreground normal-case">optional</span>
            </p>
            <div className="flex flex-wrap items-center gap-4">
              {shownImage && (
                <div className="relative">
                  <img src={shownImage} alt="Cover preview" className="h-32 w-44 -rotate-1 border-4 border-[#fffaf0] object-cover shadow-[2px_2px_0_rgb(44_48_37/0.25)]" />
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null)
                      setKeepImage(false)
                      if (fileRef.current) fileRef.current.value = ""
                    }}
                    className="absolute -top-2 -right-2 grid size-7 place-items-center rounded-full border border-wine bg-paper text-wine"
                    aria-label="Remove photo"
                  >
                    <XIcon weight="bold" className="size-4" />
                  </button>
                </div>
              )}
              <div>
                <input ref={fileRef} id="ef-image" type="file" accept="image/*" className="sr-only" onChange={(e) => onPickFile(e.target.files?.[0] ?? null)} />
                <label htmlFor="ef-image" className={cn(buttonVariants({ variant: "outline" }), "cursor-pointer")}>
                  <CameraIcon weight="duotone" /> {shownImage ? "Choose a different photo" : "Add a photo"}
                </label>
                <p className="mt-1.5 text-sm text-muted-foreground">JPG or PNG, up to 5 MB.</p>
                {errors.image && <p role="alert" className="text-sm font-semibold text-destructive">{errors.image}</p>}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="submit" size="lg" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Create gathering"}</Button>
            <Link href="/host" className={buttonVariants({ variant: "outline", size: "lg" })}>Cancel</Link>
          </div>
        </form>
      )}
    </div>
  )
}
