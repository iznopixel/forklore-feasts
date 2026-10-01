"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { format } from "date-fns"
import { toast } from "sonner"
import { ArrowLeftIcon, CameraIcon, XIcon } from "@phosphor-icons/react"
import { FormField } from "@/components/cookbook/form-field"
import { SectionHeader } from "@/components/cookbook/ornaments"
import { CardSkeletons, EmptyNote, ErrorNote } from "@/components/cookbook/states"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { createEvent, fetchEventBySlug, fetchHostStatus, updateEvent, uploadImage } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { mediaUrl } from "@/lib/supabase"
import { useAsync } from "@/lib/use-async"
import { cn } from "@/lib/utils"

const MAX_IMAGE_BYTES = 5 * 1024 * 1024

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
  const [errors, setErrors] = useState<{ title?: string; starts?: string; image?: string }>({})
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
  }, [existing.data])

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
          <FormField id="ef-theme" label="Theme" hint="A short tagline, like “Cozy pots & ladles”.">
            <Input id="ef-theme" value={theme} maxLength={120} onChange={(e) => setTheme(e.target.value)} />
          </FormField>
          <FormField id="ef-start" label="Date & time" required error={errors.starts}>
            <Input id="ef-start" type="datetime-local" value={startsAt} aria-invalid={Boolean(errors.starts)} onChange={(e) => setStartsAt(e.target.value)} />
          </FormField>
          <FormField id="ef-desc" label="Description">
            <Textarea id="ef-desc" rows={5} value={description} maxLength={2000} onChange={(e) => setDescription(e.target.value)} />
          </FormField>

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
