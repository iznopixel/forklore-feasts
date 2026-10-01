"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowLeftIcon,
  CalendarBlankIcon,
  ClockIcon,
  CookingPotIcon,
  LinkSimpleIcon,
  PencilSimpleIcon,
  TrashIcon,
  UserIcon,
  UsersIcon,
} from "@phosphor-icons/react"
import { Annotation, Flourish } from "@/components/cookbook/ornaments"
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
import { deleteRecipe, fetchRecipeBySlug } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { minutesLabel, shortDate } from "@/lib/format"
import { mediaUrl } from "@/lib/supabase"
import { categoryIcon } from "@/lib/taxonomy"
import { useAsync } from "@/lib/use-async"

export default function RecipeDetailPage() {
  const { slug = "" } = useParams<{ slug?: string }>()
  const router = useRouter()
  const { userId } = useAuth()
  const { data: recipe, error, loading, reload } = useAsync(() => fetchRecipeBySlug(slug), [slug])
  const [confirming, setConfirming] = useState(false)

  if (loading && !recipe) {
    return <div className="mx-auto h-[32rem] max-w-4xl animate-pulse px-4 py-10" aria-busy="true"><div className="size-full bg-muted/60" /></div>
  }
  if (error) return <div className="px-4 py-16"><ErrorNote message={error} onRetry={reload} /></div>
  if (!recipe) {
    return (
      <div className="px-4 py-16">
        <EmptyNote title="We couldn’t find that recipe" action={<Link href="/recipes" className={buttonVariants()}>Back to recipes</Link>}>
          It may have been removed by its cook.
        </EmptyNote>
      </div>
    )
  }

  const Icon = categoryIcon(recipe.category)
  const image = mediaUrl(recipe.image_path)
  const mine = !!userId && recipe.owner_user_id === userId
  const events = recipe.dishes
    .map((d) => d.events)
    .filter((e): e is NonNullable<typeof e> => Boolean(e))
    .filter((e, i, arr) => arr.findIndex((x) => x.id === e.id) === i)
  const facts = [
    { icon: ClockIcon, label: "Prep", value: minutesLabel(recipe.prep_time_minutes) },
    { icon: CookingPotIcon, label: "Cook", value: minutesLabel(recipe.cook_time_minutes) },
    { icon: UsersIcon, label: "Serves", value: recipe.servings ? String(recipe.servings) : null },
  ].filter((f) => f.value)

  async function remove() {
    try {
      await deleteRecipe(recipe!.id)
      toast.success("Recipe removed.")
      router.push("/recipes")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn’t delete that recipe.")
    }
  }

  return (
    <article className="gingham-blue -mb-24">
      <div className="mx-auto max-w-5xl px-4 pt-10 pb-16 sm:px-6">
      <Link href="/recipes" className="inline-flex items-center gap-2 text-sm font-bold tracking-widest text-wine uppercase hover:underline">
        <ArrowLeftIcon weight="bold" /> All recipes
      </Link>

      {/* Recipe card */}
      <div className="index-card relative mt-6 p-6 sm:p-10" style={{ backgroundImage: "none" }}>
        <div className="tape -top-3 left-10 -rotate-3" aria-hidden="true" />
        <header className="grid gap-8 md:grid-cols-[1fr_20rem]">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold tracking-[0.2em] text-moss uppercase">
              <Icon weight="fill" className="size-5" /> {recipe.category ?? "Recipe"}
            </p>
            <h1 className="display mt-3 text-[clamp(3.25rem,9vw,6.25rem)] text-wine">{recipe.name}</h1>
            <p className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-lg">
              <span className="inline-flex items-center gap-2">
                <UserIcon weight="fill" className="size-5 text-tomato" />
                from the kitchen of <strong className="font-heading text-xl">{recipe.contributor_name}</strong>
              </span>
            </p>
            {events.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {events.map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/events/${e.slug}`}
                      className="inline-flex items-center gap-1.5 border border-foreground/40 bg-paper px-2.5 py-1 text-sm font-semibold hover:bg-muted"
                    >
                      <CalendarBlankIcon weight="fill" className="size-4 text-wine" />
                      {e.title} · {shortDate(e.starts_at)}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {recipe.description && <p className="mt-6 max-w-[52ch] font-heading text-xl leading-snug italic">{recipe.description}</p>}
          </div>
          {image && (
            <figure className="rotate-[1.5deg] self-start bg-[#fffaf0] p-2 pb-7 shadow-[3px_3px_0_rgb(44_48_37/0.2)]">
              <img src={image} alt={recipe.name} className="aspect-[4/3] w-full object-cover sepia-[0.15]" />
              <figcaption className="font-hand mt-1 text-center text-xl text-muted-foreground">{recipe.name}</figcaption>
            </figure>
          )}
        </header>

        {facts.length > 0 && (
          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-3 border-y-2 border-double border-foreground/40 py-4">
            {facts.map(({ icon: FactIcon, label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <FactIcon weight="duotone" className="size-7 text-tomato" />
                <div>
                  <dt className="text-[0.7rem] font-bold tracking-[0.18em] text-muted-foreground uppercase">{label}</dt>
                  <dd className="font-heading text-xl font-bold">{value}</dd>
                </div>
              </div>
            ))}
          </dl>
        )}

        <div className="mt-10 grid gap-10 md:grid-cols-[minmax(0,17rem)_1fr] md:gap-14">
          <section aria-labelledby="ingredients">
            <h2 id="ingredients" className="mb-4 font-heading text-3xl font-bold">Ingredients</h2>
            {recipe.ingredients.length > 0 ? (
              <ul className="space-y-2.5">
                {recipe.ingredients.map((ing, i) => (
                  <li key={i} className="flex gap-3 border-b border-dotted border-border pb-2">
                    <span aria-hidden="true" className="mt-2 size-2 shrink-0 rotate-45 bg-tomato" />
                    <span>{ing}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground italic">Ingredients haven’t been written down yet.</p>
            )}
          </section>

          <section aria-labelledby="method">
            <h2 id="method" className="mb-4 font-heading text-3xl font-bold">Method</h2>
            {recipe.instructions.length > 0 ? (
              <ol className="space-y-5">
                {recipe.instructions.map((step, i) => (
                  <li key={i} className="flex gap-4">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-wine bg-ochre/30 font-heading text-lg font-black text-wine">
                      {i + 1}
                    </span>
                    <p className="pt-1">{step}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-muted-foreground italic">No steps yet.</p>
            )}
          </section>
        </div>

        {recipe.notes && (
          <aside className="relative mt-12 border-2 border-dashed border-ochre bg-ochre/15 p-6 md:-rotate-[0.4deg]">
            <Annotation className="mb-2 block" rotate={-2}>cook’s notes</Annotation>
            <p className="whitespace-pre-line text-[1.05rem]">{recipe.notes}</p>
          </aside>
        )}

        {(recipe.tags.length > 0 || recipe.source_url) && (
          <footer className="mt-10 flex flex-wrap items-center gap-3">
            {recipe.tags.map((t) => (
              <Link key={t} href={`/recipes?tag=${encodeURIComponent(t)}`}>
                <Badge variant="outline" className="h-7 border-moss/70 px-2.5 text-moss hover:bg-moss/10">{t}</Badge>
              </Link>
            ))}
            {recipe.source_url && (
              <a href={recipe.source_url} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold text-tomato underline-offset-4 hover:underline">
                <LinkSimpleIcon weight="bold" /> Original source
              </a>
            )}
          </footer>
        )}
      </div>

      {mine && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Annotation rotate={-2}>your recipe</Annotation>
          <Link href={`/recipes/${recipe.slug}/edit`} className={buttonVariants({ variant: "outline" })}>
            <PencilSimpleIcon weight="bold" /> Edit
          </Link>
          <Button variant="destructive" onClick={() => setConfirming(true)}>
            <TrashIcon weight="bold" /> Delete
          </Button>
        </div>
      )}
      <Flourish className="mx-auto mt-14 max-w-xs text-wine" />
      </div>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{recipe.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              The recipe will be removed from the recipe box. Dishes that pointed to it will stay on their gatherings, without a recipe.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={() => void remove()}>Delete recipe</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  )
}
