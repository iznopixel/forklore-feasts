"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowLeftIcon,
  BookOpenTextIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react"
import { DishDialog } from "@/components/cookbook/dish-dialog"
import { Annotation, SectionHeader, Squiggle } from "@/components/cookbook/ornaments"
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
      {/* Invitation spread: parchment page, cookbook-style two columns */}
      <section className="linen">
        <div className="mx-auto max-w-6xl px-4 pt-8 pb-10 sm:px-6 sm:pt-10 sm:pb-12">
          <Link href="/events" className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase hover:text-tomato">
            <ArrowLeftIcon weight="bold" className="size-3.5" /> All gatherings
          </Link>

          <div className="relative mt-8 grid grid-cols-[minmax(0,1fr)] gap-14 rounded-[3px] border border-[#d8cca9]/80 bg-[#f8f1e1] px-6 py-10 shadow-[0_1px_0_rgb(255_255_255/0.6)_inset,0_28px_50px_-28px_rgb(85_40_41/0.35),0_2px_6px_rgb(60_40_20/0.1)] sm:px-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-center lg:gap-24">
            <div className="max-w-xl">
              <p className="text-[0.7rem] font-bold tracking-[0.3em] text-tomato uppercase">
                {upcoming ? "You’re invited" : "A gathering to remember"}
              </p>
              <h1 className="display mt-5 text-[clamp(2.5rem,7vw,4.75rem)] leading-[0.98] break-words text-foreground">
                {event.title}
              </h1>
              {event.theme && (
                <p className="mt-5 font-heading text-xl leading-snug font-medium text-muted-foreground italic sm:text-2xl">
                  {event.theme}
                </p>
              )}

              <dl className="mt-10 grid grid-cols-2 border-y border-[#cdbf99]/70 py-5">
                <div className="pr-6">
                  <dt className="text-[0.65rem] font-bold tracking-[0.25em] text-tomato uppercase">Date</dt>
                  <dd className="mt-1 font-display text-xl leading-tight sm:text-2xl">{longDate(event.starts_at)}</dd>
                </div>
                <div className="border-l border-[#cdbf99]/70 pl-6">
                  <dt className="text-[0.65rem] font-bold tracking-[0.25em] text-tomato uppercase">Time</dt>
                  <dd className="mt-1 font-display text-xl leading-tight sm:text-2xl">{timeOfDay(event.starts_at)}</dd>
                </div>
              </dl>

              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
                <Button size="lg" onClick={openAdd} className="btn-letterpress h-11 px-6 text-base">
                  <PlusIcon weight="bold" /> {upcoming ? "Add what you’re bringing" : "Add what you brought"}
                </Button>
                <Annotation className="text-tomato" rotate={-3}>{style.scrawl}</Annotation>
              </div>
            </div>

            <div className={cn("relative mx-auto w-full max-w-sm lg:max-w-none", cover && "max-lg:order-first")}>
              <div aria-hidden="true" className="absolute -inset-x-4 inset-y-6 -z-0 hidden rotate-[2deg] bg-moss/25 lg:block" />
              {cover ? (
                <figure className="relative max-w-md rotate-[1.5deg] bg-[#fdf8ec] p-3 pb-10 text-ink shadow-[0_1px_2px_rgb(60_40_20/0.25),0_14px_28px_-8px_rgb(60_40_20/0.35)] lg:max-w-none">
                  <img src={cover} alt={event.title} className="aspect-square w-full object-cover" />
                  <figcaption className="font-hand absolute inset-x-0 bottom-2 text-center text-xl text-tomato">
                    {d.month} {d.day}
                  </figcaption>
                </figure>
              ) : (
                <div className="relative mx-auto flex size-36 rotate-6 flex-col items-center justify-center rounded-full border-[1.5px] border-tomato/80 text-center leading-none text-tomato outline-1 outline-offset-4 outline-tomato/40">
                  <span className="text-[0.6rem] font-bold tracking-[0.3em] uppercase">{d.weekday}</span>
                  <span className="my-1 font-display text-5xl">{d.day}</span>
                  <span className="text-[0.6rem] font-bold tracking-[0.3em] uppercase">{d.month} {d.year}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Details: a sage card on the same gingham, so the cloth carries on to the dishes band */}
        <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24">
          <section className="grid grid-cols-[minmax(0,1fr)] gap-10 rounded-[3px] border border-[#9fae9f]/70 bg-sky px-6 py-10 shadow-[0_28px_50px_-28px_rgb(44_48_37/0.35),0_2px_6px_rgb(60_40_20/0.1)] sm:px-12 sm:py-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:items-center md:gap-16">
            <dl className="grid content-start gap-5">
              <div>
                <dt className="text-[0.65rem] font-bold tracking-[0.25em] text-tomato uppercase">Theme</dt>
                <dd className="mt-1 font-display text-xl italic">{event.theme ?? "Anything goes"}</dd>
              </div>
              <div className="border-t border-foreground/20 pt-5">
                <dt className="text-[0.65rem] font-bold tracking-[0.25em] text-tomato uppercase">On the table</dt>
                <dd className="mt-1 font-semibold">
                  {event.dishes.length} {event.dishes.length === 1 ? "dish" : "dishes"} · {recipeCount} {recipeCount === 1 ? "recipe" : "recipes"} shared
                </dd>
              </div>
            </dl>

            <aside className="index-card relative p-6 sm:p-8 md:-rotate-[0.6deg]">
              <div className="tape -top-3 right-10 rotate-3" aria-hidden="true" />
              <Annotation className="mb-3 block" rotate={-2}>a note from your host</Annotation>
              <p className="font-heading text-xl leading-snug">
                {event.description ??
                  "Come as you are and bring a dish to share. There’s always room for one more chair."}
              </p>
            </aside>
          </section>
        </div>
      </section>

      {/* Dishes: the one olive panel on the page */}
      <div className="border-t border-[#cdbf99]/70 bg-[color-mix(in_oklab,var(--moss)_16%,var(--background))]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <section>
          <SectionHeader
            kicker={upcoming ? "who’s bringing what" : "what we shared"}
            title="On the table"
            action={
              <Button onClick={openAdd} className="btn-letterpress">
                <PlusIcon weight="bold" /> {upcoming ? "Add what you’re bringing" : "Add what you brought"}
              </Button>
            }
          />

          {event.dishes.length === 0 ? (
            <EmptyNote
              title="The table’s still bare"
              action={<Button onClick={openAdd} className="btn-letterpress"><PlusIcon weight="bold" /> Be the first to add a dish</Button>}
            >
              Add a dish, even a half-formed idea, so everyone can plan around it.
            </EmptyNote>
          ) : (
            <ul className="grid gap-6 md:grid-cols-2">
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
        </section>
        </div>
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
      <div className="grid size-10 shrink-0 place-items-center rounded-full border border-tomato/50 text-tomato">
        <Icon weight="regular" className="size-5" />
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
