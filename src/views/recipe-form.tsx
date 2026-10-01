"use client"

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowLeftIcon,
  CameraIcon,
  CheckIcon,
  CookingPotIcon,
  PlusIcon,
  XIcon,
} from "@phosphor-icons/react"
import { FormField } from "@/components/cookbook/form-field"
import { GuestNotice } from "@/components/cookbook/guest-notice"
import { Annotation, SectionHeader } from "@/components/cookbook/ornaments"
import { EmptyNote, ErrorNote } from "@/components/cookbook/states"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import {
  createDish,
  createRecipe,
  fetchEventBySlug,
  fetchEvents,
  fetchMyDishesForEvent,
  fetchRecipeBySlug,
  updateDish,
  updateRecipe,
  uploadImage,
} from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { longDate } from "@/lib/format"
import { mediaUrl } from "@/lib/supabase"
import { DIETARY_TAGS, DISH_CATEGORIES, normalizeTag } from "@/lib/taxonomy"
import type { Dish, EventSummary, RecipeInput } from "@/lib/types"
import { useAsync } from "@/lib/use-async"
import { getSavedName, saveName, useRequireUser } from "@/lib/use-writer"
import { cn } from "@/lib/utils"

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const NEW_DISH = "__new__"

/** One item per line; tolerate pasted bullets and "1." numbering. */
function toList(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim().replace(/^(?:[-•*]|\d+[.)])\s+/, ""))
    .filter(Boolean)
}

const toInt = (v: string) => {
  const n = parseInt(v, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

interface Errors {
  name?: string
  who?: string
  ingredients?: string
  instructions?: string
  source?: string
  image?: string
}

export default function RecipeFormPage() {
  const { slug } = useParams<{ slug?: string }>()
  const editing = Boolean(slug)
  const router = useRouter()
  const params = useSearchParams()
  const { userId, status } = useAuth()
  const requireUser = useRequireUser()

  const existing = useAsync(() => (slug ? fetchRecipeBySlug(slug) : Promise.resolve(null)), [slug])
  const events = useAsync(fetchEvents, [])

  const [name, setName] = useState("")
  const [who, setWho] = useState(getSavedName)
  const [category, setCategory] = useState("")
  const [description, setDescription] = useState("")
  const [ingredients, setIngredients] = useState("")
  const [instructions, setInstructions] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [customTag, setCustomTag] = useState("")
  const [prep, setPrep] = useState("")
  const [cook, setCook] = useState("")
  const [servings, setServings] = useState("")
  const [source, setSource] = useState("")
  const [notes, setNotes] = useState("")
  const [eventId, setEventId] = useState("")
  const [linkedEvent, setLinkedEvent] = useState<EventSummary | null>(null)
  const [dishChoice, setDishChoice] = useState(NEW_DISH)
  const [myDishes, setMyDishes] = useState<Dish[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [keepImage, setKeepImage] = useState(true)
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const hydrated = useRef(false)

  // Prefill when editing
  useEffect(() => {
    const r = existing.data
    if (!r || hydrated.current) return
    hydrated.current = true
    setName(r.name)
    setWho(r.contributor_name)
    setCategory(r.category ?? "")
    setDescription(r.description ?? "")
    setIngredients(r.ingredients.join("\n"))
    setInstructions(r.instructions.join("\n"))
    setTags(r.tags)
    setPrep(r.prep_time_minutes?.toString() ?? "")
    setCook(r.cook_time_minutes?.toString() ?? "")
    setServings(r.servings?.toString() ?? "")
    setSource(r.source_url ?? "")
    setNotes(r.notes ?? "")
  }, [existing.data])

  // Preselect event from ?event=<slug>
  const eventSlug = params.get("event")
  useEffect(() => {
    if (editing || !events.data || !eventSlug) return
    const match = events.data.find((e) => e.slug === eventSlug)
    if (match) return setEventId((cur) => cur || match.id)
    // Unlisted events aren't in the public list; fetch by slug so the link still works
    void fetchEventBySlug(eventSlug).then((e) => {
      if (e) {
        setLinkedEvent(e)
        setEventId((cur) => cur || e.id)
      }
    })
  }, [editing, events.data, eventSlug])

  // Which of my dishes at that gathering still lack a recipe?
  const wantedDish = params.get("dish")
  useEffect(() => {
    if (editing || !eventId || !userId) {
      setMyDishes([])
      return
    }
    let cancelled = false
    fetchMyDishesForEvent(eventId)
      .then((rows) => {
        if (cancelled) return
        const open = (rows as Dish[]).filter((d) => !d.recipe_id)
        setMyDishes(open)
        const preferred = open.find((d) => d.id === wantedDish)
        setDishChoice(preferred ? preferred.id : NEW_DISH)
        if (preferred && !hydrated.current) {
          hydrated.current = true
          setName((n) => n || preferred.name)
          setCategory((c) => c || preferred.category || "")
          setWho((w) => w || preferred.contributor_name)
        }
      })
      .catch(() => setMyDishes([]))
    return () => {
      cancelled = true
    }
  }, [editing, eventId, userId, wantedDish])

  useEffect(() => {
    if (!file) return setPreview(null)
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const eventsSorted = useMemo(
    () => {
      const list = events.data ?? []
      const all = linkedEvent && !list.some((e) => e.id === linkedEvent.id) ? [...list, linkedEvent] : list
      return [...all].sort((a, b) => b.starts_at.localeCompare(a.starts_at))
    },
    [events.data, linkedEvent]
  )

  const existingImage = editing && keepImage ? mediaUrl(existing.data?.image_path) : null
  const shownImage = preview ?? existingImage

  const toggleTag = (t: string) =>
    setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))
  const addCustomTag = () => {
    const t = normalizeTag(customTag)
    if (t && !tags.includes(t)) setTags((cur) => [...cur, t])
    setCustomTag("")
  }

  function onPickFile(f: File | null) {
    if (!f) return
    if (!f.type.startsWith("image/")) return setErrors((e) => ({ ...e, image: "Please choose an image file." }))
    if (f.size > MAX_IMAGE_BYTES) return setErrors((e) => ({ ...e, image: "That photo is over 5 MB — try a smaller one." }))
    setErrors((e) => ({ ...e, image: undefined }))
    setFile(f)
  }

  function validate(): Errors {
    const e: Errors = {}
    if (!name.trim()) e.name = "Every recipe needs a name."
    if (!who.trim()) e.who = "Add your name so the cook gets credit."
    if (toList(ingredients).length === 0) e.ingredients = "List at least one ingredient."
    if (toList(instructions).length === 0) e.instructions = "Add at least one step."
    if (source.trim()) {
      try {
        const u = new URL(source.trim())
        if (!/^https?:$/.test(u.protocol)) throw new Error()
      } catch {
        e.source = "That doesn’t look like a web address (start with https://)."
      }
    }
    return e
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    const found = validate()
    setErrors((cur) => ({ image: cur.image, ...found }))
    if (Object.keys(found).length) {
      toast.error("A few things need your attention.")
      document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus()
      return
    }
    setSaving(true)
    try {
      const uid = await requireUser()
      if (!uid) return
      saveName(who.trim())

      let image_path: string | null | undefined = undefined
      if (file) image_path = await uploadImage(file)
      else if (editing && !keepImage) image_path = null

      const input: RecipeInput = {
        name: name.trim(),
        contributor_name: who.trim(),
        description: description.trim() || null,
        category: category || null,
        ingredients: toList(ingredients),
        instructions: toList(instructions),
        tags,
        prep_time_minutes: toInt(prep),
        cook_time_minutes: toInt(cook),
        servings: toInt(servings),
        source_url: source.trim() || null,
        notes: notes.trim() || null,
        ...(image_path !== undefined ? { image_path } : {}),
      }

      if (editing && existing.data) {
        const saved = await updateRecipe(existing.data.id, input)
        toast.success("Recipe updated.")
        router.push(`/recipes/${saved.slug}`)
        return
      }

      const recipe = await createRecipe(input)
      if (eventId) {
        try {
          if (dishChoice !== NEW_DISH) {
            await updateDish(dishChoice, { recipe_id: recipe.id })
          } else {
            await createDish({
              event_id: eventId,
              contributor_name: input.contributor_name,
              name: input.name,
              category: input.category,
              note: null,
              recipe_id: recipe.id,
            })
          }
        } catch (err) {
          toast.warning(
            `Recipe saved, but it couldn’t be attached to the gathering: ${err instanceof Error ? err.message : "unknown error"}`
          )
        }
      }
      toast.success("Recipe added to the box!")
      router.push(`/recipes/${recipe.slug}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn’t save that recipe.")
    } finally {
      setSaving(false)
    }
  }

  // ---- Loading / guard states while editing
  if (editing && existing.loading && !existing.data) {
    return <div className="mx-auto h-96 max-w-3xl animate-pulse px-4 py-10" aria-busy="true"><div className="size-full bg-muted/60" /></div>
  }
  if (editing && existing.error) return <div className="px-4 py-16"><ErrorNote message={existing.error} onRetry={existing.reload} /></div>
  if (editing && !existing.data) {
    return (
      <div className="px-4 py-16">
        <EmptyNote title="We couldn’t find that recipe" action={<Link href="/recipes" className={buttonVariants()}>Back to recipes</Link>} />
      </div>
    )
  }
  if (editing && existing.data && status === "ready" && userId !== existing.data.owner_user_id) {
    return (
      <div className="px-4 py-16">
        <EmptyNote
          title="Only the cook can edit this recipe"
          action={<Link href={`/recipes/${existing.data.slug}`} className={buttonVariants()}>Back to the recipe</Link>}
        >
          Recipes can be edited from the same device that added them.
        </EmptyNote>
      </div>
    )
  }

  const linkedEvents = editing
    ? (existing.data?.dishes ?? []).map((d) => d.events).filter((e): e is NonNullable<typeof e> => Boolean(e))
    : []

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link
        href={editing && existing.data ? `/recipes/${existing.data.slug}` : "/recipes"}
        className="inline-flex items-center gap-2 text-sm font-bold tracking-widest text-wine uppercase hover:underline"
      >
        <ArrowLeftIcon weight="bold" /> Back
      </Link>
      <div className="mt-6">
        <SectionHeader
          as="h1"
          kicker={editing ? "touch it up" : "write it down before it’s lost"}
          title={editing ? "Edit recipe" : "Add a recipe"}
        />
      </div>
      <GuestNotice />

      <form onSubmit={onSubmit} noValidate className="index-card relative mt-6 grid gap-7 p-5 sm:p-8" style={{ backgroundImage: "none" }}>
        <div className="tape -top-3 right-10 rotate-2" aria-hidden="true" />

        {/* Event / dish */}
        {!editing ? (
          <fieldset className="grid gap-4 border-b border-dashed border-border pb-7">
            <legend className="mb-1 font-heading text-xl font-bold">Which gathering is it for?</legend>
            <FormField id="rf-event" label="Event" hint="Pick the potluck this dish was (or will be) brought to. Skip it to just share the recipe.">
              <NativeSelect id="rf-event" value={eventId} onChange={(e) => setEventId(e.target.value)} className="w-full">
                <NativeSelectOption value="">No particular gathering</NativeSelectOption>
                {eventsSorted.map((e) => (
                  <NativeSelectOption key={e.id} value={e.id}>
                    {e.title} — {longDate(e.starts_at)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </FormField>
            {eventId && myDishes.length > 0 && (
              <FormField id="rf-dish" label="Dish" required hint="Attach this recipe to a dish you already signed up with, or add a new one.">
                <NativeSelect id="rf-dish" value={dishChoice} onChange={(e) => setDishChoice(e.target.value)} className="w-full">
                  {myDishes.map((d) => (
                    <NativeSelectOption key={d.id} value={d.id}>{d.name}</NativeSelectOption>
                  ))}
                  <NativeSelectOption value={NEW_DISH}>A different dish (new)</NativeSelectOption>
                </NativeSelect>
              </FormField>
            )}
          </fieldset>
        ) : (
          linkedEvents.length > 0 && (
            <p className="border-b border-dashed border-border pb-5 text-sm text-muted-foreground">
              Brought to: {linkedEvents.map((e) => e.title).join(", ")}
            </p>
          )
        )}

        <div className="grid gap-5 sm:grid-cols-[1.4fr_1fr]">
          <FormField id="rf-name" label="Recipe name" required error={errors.name}>
            <Input id="rf-name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} placeholder="Auntie Lo’s harvest chili" />
          </FormField>
          <FormField id="rf-who" label="Your name" required error={errors.who}>
            <Input id="rf-who" value={who} onChange={(e) => setWho(e.target.value)} aria-invalid={!!errors.who} autoComplete="given-name" />
          </FormField>
        </div>

        <FormField id="rf-cat" label="Dish category">
          <NativeSelect id="rf-cat" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full sm:w-72">
            <NativeSelectOption value="">Choose one…</NativeSelectOption>
            {DISH_CATEGORIES.map((c) => (
              <NativeSelectOption key={c} value={c}>{c}</NativeSelectOption>
            ))}
          </NativeSelect>
        </FormField>

        <FormField id="rf-desc" label="Description" hint="A line or two about the dish, or the story behind it.">
          <Textarea id="rf-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </FormField>

        <div className="grid gap-7 md:grid-cols-2">
          <FormField id="rf-ing" label="Ingredients" required error={errors.ingredients} hint="One per line.">
            <Textarea
              id="rf-ing"
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              aria-invalid={!!errors.ingredients}
              rows={8}
              placeholder={"2 cups dried beans\n1 onion, diced\n1 tbsp smoked paprika"}
            />
          </FormField>
          <FormField id="rf-ins" label="Instructions" required error={errors.instructions} hint="One step per line — numbers are added for you.">
            <Textarea
              id="rf-ins"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              aria-invalid={!!errors.instructions}
              rows={8}
              placeholder={"Soak the beans overnight.\nSoften the onion in oil.\nSimmer everything for 2 hours."}
            />
          </FormField>
        </div>

        {/* Dietary tags */}
        <fieldset className="grid gap-3">
          <legend className="text-[0.8rem] font-bold tracking-[0.1em] uppercase">
            Dietary tags <span className="font-hand text-lg font-normal tracking-normal text-muted-foreground normal-case">optional</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {[...DIETARY_TAGS, ...tags.filter((t) => !(DIETARY_TAGS as readonly string[]).includes(t))].map((t) => {
              const on = tags.includes(t)
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleTag(t)}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-sm border px-3 text-sm font-bold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
                    on ? "border-moss bg-moss text-[#f4eedc]" : "border-foreground/40 bg-paper hover:bg-muted"
                  )}
                >
                  {on && <CheckIcon weight="bold" className="size-4" />}
                  {t}
                </button>
              )
            })}
          </div>
          <div className="flex max-w-sm gap-2">
            <label htmlFor="rf-tag" className="sr-only">Add your own tag</label>
            <Input
              id="rf-tag"
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addCustomTag()
                }
              }}
              placeholder="Add your own (e.g. make-ahead)"
            />
            <Button type="button" variant="outline" onClick={addCustomTag} aria-label="Add tag"><PlusIcon weight="bold" /></Button>
          </div>
        </fieldset>

        {/* Image */}
        <div className="grid gap-2">
          <p className="text-[0.8rem] font-bold tracking-[0.1em] uppercase">
            Photo <span className="font-hand text-lg font-normal tracking-normal text-muted-foreground normal-case">optional</span>
          </p>
          <div className="flex flex-wrap items-center gap-4">
            {shownImage ? (
              <div className="relative">
                <img src={shownImage} alt="Recipe preview" className="h-32 w-44 -rotate-1 border-4 border-[#fffaf0] object-cover shadow-[2px_2px_0_rgb(44_48_37/0.25)]" />
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
            ) : null}
            <div>
              <input
                ref={fileRef}
                id="rf-image"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
              />
              <label htmlFor="rf-image" className={cn(buttonVariants({ variant: "outline" }), "cursor-pointer")}>
                <CameraIcon weight="duotone" /> {shownImage ? "Choose a different photo" : "Add a photo"}
              </label>
              <p className="mt-1.5 text-sm text-muted-foreground">JPG or PNG, up to 5 MB.</p>
              {errors.image && <p role="alert" className="text-sm font-semibold text-destructive">{errors.image}</p>}
            </div>
          </div>
        </div>

        {/* More details */}
        <details className="group border-t border-dashed border-border pt-6" open={editing && Boolean(prep || cook || servings || source || notes)}>
          <summary className="flex cursor-pointer list-none items-center gap-2 font-heading text-xl font-bold select-none">
            <span className="grid size-6 place-items-center border border-foreground/50 text-base leading-none group-open:hidden">+</span>
            <span className="hidden size-6 place-items-center border border-foreground/50 text-base leading-none group-open:grid">–</span>
            More details
            <Annotation rotate={-2} className="text-lg">times, servings, notes</Annotation>
          </summary>
          <div className="mt-5 grid gap-5">
            <div className="grid gap-5 sm:grid-cols-3">
              <FormField id="rf-prep" label="Prep (min)">
                <Input id="rf-prep" inputMode="numeric" value={prep} onChange={(e) => setPrep(e.target.value.replace(/\D/g, ""))} />
              </FormField>
              <FormField id="rf-cook" label="Cook (min)">
                <Input id="rf-cook" inputMode="numeric" value={cook} onChange={(e) => setCook(e.target.value.replace(/\D/g, ""))} />
              </FormField>
              <FormField id="rf-serv" label="Serves">
                <Input id="rf-serv" inputMode="numeric" value={servings} onChange={(e) => setServings(e.target.value.replace(/\D/g, ""))} />
              </FormField>
            </div>
            <FormField id="rf-notes" label="Cook’s notes" hint="Substitutions, make-ahead tips, what you’d change next time.">
              <Textarea id="rf-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </FormField>
            <FormField id="rf-src" label="Original source" error={errors.source}>
              <Input id="rf-src" type="url" value={source} onChange={(e) => setSource(e.target.value)} aria-invalid={!!errors.source} placeholder="https://" />
            </FormField>
          </div>
        </details>

        <div className="flex flex-col-reverse gap-3 border-t-2 border-double border-foreground/40 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <Link href={editing && existing.data ? `/recipes/${existing.data.slug}` : "/recipes"} className={cn(buttonVariants({ variant: "ghost" }), "justify-center")}>
            Cancel
          </Link>
          <Button type="submit" size="lg" disabled={saving}>
            <CookingPotIcon weight="fill" /> {saving ? "Saving…" : editing ? "Save changes" : "Add to the recipe box"}
          </Button>
        </div>
      </form>
    </div>
  )
}
