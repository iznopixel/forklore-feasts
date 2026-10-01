"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowLeftIcon,
  BookOpenTextIcon,
  CalendarBlankIcon,
  ClockIcon,
  PencilSimpleIcon,
  PlusIcon,
  QuotesIcon,
  StarIcon,
  TrashIcon,
} from "@phosphor-icons/react"
import { DishDialog } from "@/components/cookbook/dish-dialog"
import { Annotation, Flourish, SectionHeader, Squiggle } from "@/components/cookbook/ornaments"
import { PosterSurface } from "@/components/cookbook/poster"
import { EmptyNote, ErrorNote } from "@/components/cookbook/states"
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
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { deleteDish, fetchEventBySlug } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { distinctRecipeCount, isUpcoming, longDate, monthDay, timeOfDay } from "@/lib/format"
import { categoryIcon, posterStyle } from "@/lib/taxonomy"
import { mediaUrl } from "@/lib/supabase"
import type { Dish, DishWithRecipe } from "@/lib/types"
import { useAsync } from "@/lib/use-async"
import { cn } from "@/lib/utils"

export default function EventDetailPage() {
  const { slug = "" } = useParams<{ slug?: string }>()
  const router = useRouter()
  const { userId } = useAuth()
  const { data: event, error, loading, reload } = useAsync(() => fetchEventBySlug(slug), [slug])

  const [dishDialog, setDishDialog] = useState<{ open: boolean; dish: Dish | null }>({ open: false, dish: null })
  const [toDelete, setToDelete] = useState<DishWithRecipe | null>(null)

  if (loading && !event) {
    return <div className="mx-auto h-[32rem] max-w-6xl animate-pulse px-4 py-10" aria-busy="true"><div className="size-full bg-muted/60" /></div>
  }
  if (error) return <div className="px-4 py-16"><ErrorNote message={error} onRetry={reload} /></div>
  if (!event) {
    return (
      <div className="px-4 py-16">
        <EmptyNote
          title="We couldn’t find that gathering"
          action={<Link href="/events" className={buttonVariants()}>Back to all gatherings</Link>}
        >
          It may have been renamed or removed.
        </EmptyNote>
      </div>
    )
  }

  const upcoming = isUpcoming(event.starts_at)
  const style = posterStyle(event)
  const d = monthDay(event.starts_at)
  const cover = mediaUrl(event.cover_image_path)
  const recipeCount = distinctRecipeCount(event.dishes)

  const openAdd = () => setDishDialog({ open: true, dish: null })

  async function confirmDelete() {
    if (!toDelete) return
    try {
      await deleteDish(toDelete.id)
      toast.success("Removed from the table.")
      setToDelete(null)
      reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn’t remove that dish.")
    }
  }

  return (
    <>
      {/* Poster hero */}
      <PosterSurface event={event} className="scallop-b pb-16">
        <div className="mx-auto max-w-6xl px-4 pt-6 pb-10 sm:px-6">
          <Link href="/events" className="inline-flex items-center gap-2 text-sm font-bold tracking-widest uppercase hover:underline">
            <ArrowLeftIcon weight="bold" /> All gatherings
          </Link>

          <div className="frame mt-6 grid gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_minmax(0,26rem)] lg:items-center">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold tracking-[0.25em] uppercase">
                <StarIcon weight="fill" className="size-4" style={{ color: "var(--poster-accent)" }} />
                {upcoming ? "You’re invited" : "A gathering to remember"}
              </p>
              <h1 className="display misprint mt-4 text-[clamp(3.75rem,14vw,9.5rem)] break-words">{event.title}</h1>
              {event.theme && (
                <p className="mt-5 font-heading text-[clamp(1.4rem,3.5vw,2.25rem)] leading-tight font-semibold italic">
                  <span className="not-italic" style={{ color: "var(--poster-accent)" }}>✦</span> {event.theme}
                </p>
              )}
              <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 text-lg">
                <span className="inline-flex items-center gap-2 font-bold">
                  <CalendarBlankIcon weight="fill" className="size-6" /> {longDate(event.starts_at)}
                </span>
                <span className="inline-flex items-center gap-2 font-bold">
                  <ClockIcon weight="fill" className="size-6" /> {timeOfDay(event.starts_at)}
                </span>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-5">
                <Button
                  size="lg"
                  onClick={openAdd}
                  className="border-current bg-(--poster-ink) text-(--poster-bg) shadow-[3px_3px_0_var(--poster-accent)] hover:bg-(--poster-ink)/90"
                >
                  <PlusIcon weight="bold" /> {upcoming ? "Add what you’re bringing" : "Add what you brought"}
                </Button>
                <Annotation className="text-(--poster-accent)" rotate={-4}>{style.scrawl}</Annotation>
              </div>
            </div>

            <div className={cn("flex items-center justify-center gap-6 lg:flex-col", cover && "max-lg:order-first")}>
              {cover ? (
                <figure className="w-full max-w-md -rotate-1 bg-[#fbf3e3] p-3 pb-10 text-ink shadow-[5px_5px_0_rgb(0_0_0/0.25)] lg:max-w-none">
                  <img src={cover} alt={`${event.title}`} className="aspect-square w-full object-cover" />
                  <figcaption className="font-hand mt-1 text-center text-xl">{d.month} {d.day}</figcaption>
                </figure>
              ) : (
                <div className="flex size-36 rotate-6 flex-col items-center justify-center rounded-full border-[3px] border-current text-center leading-none sm:size-44">
                  <span className="text-xs font-bold tracking-[0.3em] uppercase">{d.weekday}</span>
                  <span className="font-heading text-6xl font-black sm:text-7xl">{d.day}</span>
                  <span className="text-xs font-bold tracking-[0.3em] uppercase">{d.month} {d.year}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </PosterSurface>

      {/* Details */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <section className="-mt-2 grid gap-8 py-12 md:grid-cols-[1fr_1.4fr]">
          <dl className="paper grid grid-cols-2 content-start gap-x-4 gap-y-5 p-6">
            <div>
              <dt className="text-[0.7rem] font-bold tracking-[0.18em] text-wine uppercase">Date</dt>
              <dd className="font-heading text-xl font-bold">{longDate(event.starts_at)}</dd>
            </div>
            <div>
              <dt className="text-[0.7rem] font-bold tracking-[0.18em] text-wine uppercase">Time</dt>
              <dd className="font-heading text-xl font-bold">{timeOfDay(event.starts_at)}</dd>
            </div>
            <div className="col-span-2 border-t border-dashed border-border pt-4">
              <dt className="text-[0.7rem] font-bold tracking-[0.18em] text-wine uppercase">Theme</dt>
              <dd className="font-heading text-xl font-bold italic">{event.theme ?? "Anything goes"}</dd>
            </div>
            <div className="col-span-2 border-t border-dashed border-border pt-4">
              <dt className="text-[0.7rem] font-bold tracking-[0.18em] text-wine uppercase">On the table</dt>
              <dd className="font-semibold">
                {event.dishes.length} {event.dishes.length === 1 ? "dish" : "dishes"} · {recipeCount} {recipeCount === 1 ? "recipe" : "recipes"} shared
              </dd>
            </div>
          </dl>

          <aside className="index-card relative p-6 sm:p-8 md:-rotate-[0.6deg]">
            <div className="tape -top-3 right-10 rotate-3" aria-hidden="true" />
            <Annotation className="mb-2 block" rotate={-2}>a note from your host</Annotation>
            <QuotesIcon weight="fill" className="mb-1 size-7 text-tomato" />
            <p className="font-heading text-xl leading-snug">
              {event.description ??
                "Come as you are and bring a dish to share. There’s always room for one more chair."}
            </p>
          </aside>
        </section>

        {/* Dishes */}
        <section className="pb-20">
          <SectionHeader
            kicker={upcoming ? "who’s bringing what" : "what we shared"}
            title="On the table"
            action={
              <Button onClick={openAdd}>
                <PlusIcon weight="bold" /> {upcoming ? "Add what you’re bringing" : "Add what you brought"}
              </Button>
            }
          />

          {event.dishes.length === 0 ? (
            <EmptyNote
              title="The table’s still bare"
              action={<Button onClick={openAdd}><PlusIcon weight="bold" /> Be the first to add a dish</Button>}
            >
              Add a dish, even a half-formed idea, so everyone can plan around it.
            </EmptyNote>
          ) : (
            <ul className="grid gap-5 md:grid-cols-2">
              {event.dishes.map((dish) => (
                <DishItem
                  key={dish.id}
                  dish={dish}
                  eventSlug={event.slug}
                  mine={!!userId && dish.owner_user_id === userId}
                  onEdit={() => setDishDialog({ open: true, dish })}
                  onDelete={() => setToDelete(dish)}
                />
              ))}
            </ul>
          )}
          <Flourish className="mx-auto mt-16 max-w-xs text-wine" />
        </section>
      </div>

      <DishDialog
        event={event}
        dish={dishDialog.dish}
        past={!upcoming}
        open={dishDialog.open}
        onOpenChange={(open) => setDishDialog((s) => ({ ...s, open }))}
        onSaved={(dish, writeRecipe) => {
          if (writeRecipe) router.push(`/recipes/new?event=${event.slug}&dish=${dish.id}`)
          else reload()
        }}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Take {toDelete?.name} off the table?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes your dish from the gathering. Any recipe you wrote stays in the recipe box.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()}>Remove dish</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function DishItem({
  dish,
  eventSlug,
  mine,
  onEdit,
  onDelete,
}: {
  dish: DishWithRecipe
  eventSlug: string
  mine: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const Icon = categoryIcon(dish.category)
  const recipe = dish.recipes
  return (
    <li className={cn("paper relative flex gap-4 p-5", mine && "border-l-[5px] border-l-moss")}>
      <div className="grid size-14 shrink-0 place-items-center rounded-full border-2 border-wine bg-ochre/30 text-wine">
        <Icon weight="fill" className="size-7" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {dish.category && <Badge variant="outline" className="border-moss/70 text-moss">{dish.category}</Badge>}
          {mine && <Badge variant="secondary">Yours</Badge>}
        </div>
        <h3 className="mt-1 font-heading text-2xl leading-tight font-bold">{dish.name}</h3>
        <p className="text-muted-foreground">
          brought by <span className="font-semibold text-foreground">{dish.contributor_name}</span>
        </p>
        {dish.note && <p className="mt-2 text-[0.95rem]">{dish.note}</p>}
        <Squiggle className="mt-3 h-2 w-16 text-border" />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {recipe ? (
            <Link href={`/recipes/${recipe.slug}`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
              <BookOpenTextIcon weight="fill" /> Read the recipe
            </Link>
          ) : mine ? (
            <Link
              href={`/recipes/new?event=${eventSlug}&dish=${dish.id}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <PlusIcon weight="bold" /> Add the recipe
            </Link>
          ) : (
            <span className="font-hand text-xl text-muted-foreground">recipe not written down yet</span>
          )}
          {mine && (
            <>
              <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label={`Edit ${dish.name}`}>
                <PencilSimpleIcon weight="bold" />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={onDelete} aria-label={`Remove ${dish.name}`}>
                <TrashIcon weight="bold" />
              </Button>
            </>
          )}
        </div>
      </div>
    </li>
  )
}
