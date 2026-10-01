"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { MagnifyingGlassIcon, PlusIcon, XIcon } from "@phosphor-icons/react"
import { Annotation, Crown, SectionHeader } from "@/components/cookbook/ornaments"
import { RecipeCard } from "@/components/cookbook/recipe-card"
import { CardSkeletons, EmptyNote, ErrorNote } from "@/components/cookbook/states"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { fetchEvents, fetchRecipeFacets, fetchRecipes } from "@/lib/api"
import { categoryIcon } from "@/lib/taxonomy"
import { useAsync } from "@/lib/use-async"
import { cn } from "@/lib/utils"

const KEYS = ["q", "category", "tag", "contributor", "event", "winner"] as const

export default function RecipesPage() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const replaceParams = (next: URLSearchParams) => {
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }
  const q = params.get("q") ?? ""
  const category = params.get("category") ?? ""
  const tag = params.get("tag") ?? ""
  const contributor = params.get("contributor") ?? ""
  const eventId = params.get("event") ?? ""
  const winnersOnly = params.get("winner") === "1"

  const [draft, setDraft] = useState(q)
  useEffect(() => setDraft(q), [q])

  const setParam = (key: (typeof KEYS)[number], value: string) =>
    {
      const next = new URLSearchParams(params.toString())
      if (value) next.set(key, value)
      else next.delete(key)
      replaceParams(next)
    }

  // Debounce search typing into the URL
  useEffect(() => {
    if (draft === q) return
    const t = setTimeout(() => setParam("q", draft.trim()), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  const facets = useAsync(fetchRecipeFacets, [])
  const events = useAsync(fetchEvents, [])
  const recipes = useAsync(
    () => fetchRecipes({ search: q, category, tag, contributor, eventId, winnersOnly }),
    [q, category, tag, contributor, eventId, winnersOnly]
  )

  const activeCount = KEYS.filter((k) => params.get(k)).length
  const clear = () => replaceParams(new URLSearchParams())

  const eventsSorted = [...(events.data ?? [])].sort((a, b) => b.starts_at.localeCompare(a.starts_at))

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <SectionHeader
        as="h1"
        kicker="the community recipe box"
        title="Recipes"
        action={
          <Link href="/recipes/new" className={buttonVariants()}>
            <PlusIcon weight="bold" /> Add a recipe
          </Link>
        }
      />

      {/* Card-catalog filters */}
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          setParam("q", draft.trim())
        }}
        className="index-card mb-8 grid gap-5 p-5 sm:p-6"
        style={{ backgroundImage: "none" }}
      >
        <div className="relative">
          <label htmlFor="recipe-search" className="sr-only">Search recipes</label>
          <MagnifyingGlassIcon weight="bold" className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-wine" />
          <Input
            id="recipe-search"
            type="search"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Search by dish, ingredient, or cook…"
            className="h-12 pl-11 text-lg"
          />
        </div>

        {facets.data && facets.data.categories.length > 0 && (
          <div role="group" aria-label="Dish type and winners" className="flex flex-wrap gap-2">
            <Chip active={winnersOnly} onClick={() => setParam("winner", winnersOnly ? "" : "1")}>
              <Crown className="size-4" /> Winners
            </Chip>
            <Chip active={!category} onClick={() => setParam("category", "")}>All dishes</Chip>
            {facets.data.categories.map((c) => {
              const Icon = categoryIcon(c)
              return (
                <Chip key={c} active={category === c} onClick={() => setParam("category", category === c ? "" : c)}>
                  <Icon weight="fill" className="size-4" /> {c}
                </Chip>
              )
            })}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <LabeledSelect id="f-tag" label="Dietary tag" value={tag} onChange={(v) => setParam("tag", v)} all="Any diet">
            {(facets.data?.tags ?? []).map((t) => (
              <NativeSelectOption key={t} value={t}>{t}</NativeSelectOption>
            ))}
          </LabeledSelect>
          <LabeledSelect id="f-event" label="Gathering" value={eventId} onChange={(v) => setParam("event", v)} all="Any gathering">
            {eventsSorted.map((e) => (
              <NativeSelectOption key={e.id} value={e.id}>{e.title}</NativeSelectOption>
            ))}
          </LabeledSelect>
          <LabeledSelect id="f-who" label="Cook" value={contributor} onChange={(v) => setParam("contributor", v)} all="Anyone">
            {(facets.data?.contributors ?? []).map((c) => (
              <NativeSelectOption key={c} value={c}>{c}</NativeSelectOption>
            ))}
          </LabeledSelect>
        </div>

        {activeCount > 0 && (
          <div>
            <Button type="button" variant="ghost" size="sm" onClick={clear}>
              <XIcon weight="bold" /> Clear filters
            </Button>
          </div>
        )}
      </form>

      {recipes.loading && !recipes.data ? (
        <CardSkeletons />
      ) : recipes.error ? (
        <ErrorNote message={recipes.error} onRetry={recipes.reload} />
      ) : recipes.data && recipes.data.length > 0 ? (
        <>
          <p className="mb-5 flex items-center gap-3 text-muted-foreground" aria-live="polite">
            <span className="font-semibold">
              {recipes.data.length} {recipes.data.length === 1 ? "recipe" : "recipes"}
            </span>
            <Annotation rotate={-2}>{activeCount > 0 ? "matching your search" : "and counting"}</Annotation>
          </p>
          <div className={cn("grid gap-7 sm:grid-cols-2 lg:grid-cols-3", recipes.loading && "opacity-60")}>
            {recipes.data.map((r, i) => (
              <RecipeCard key={r.id} recipe={r} index={i} />
            ))}
          </div>
        </>
      ) : activeCount > 0 ? (
        <EmptyNote
          title="Nothing matches that"
          action={<Button variant="outline" onClick={clear}>Clear filters</Button>}
        >
          Try a different word, or loosen a filter.
        </EmptyNote>
      ) : (
        <EmptyNote
          title="The recipe box is empty"
          action={<Link href="/recipes/new" className={buttonVariants()}>Add the first recipe</Link>}
        >
          Recipes shared by the group will collect here.
        </EmptyNote>
      )}
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-sm border px-3 text-sm font-bold tracking-wide transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
        active
          ? "border-wine bg-wine text-background shadow-[2px_2px_0_var(--ochre)]"
          : "border-foreground/40 bg-paper hover:bg-muted"
      )}
    >
      {children}
    </button>
  )
}

function LabeledSelect({
  id,
  label,
  value,
  onChange,
  all,
  children,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  all: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[0.75rem] font-bold tracking-[0.12em] uppercase">{label}</label>
      <NativeSelect id={id} value={value} onChange={(e) => onChange(e.target.value)} className="w-full">
        <NativeSelectOption value="">{all}</NativeSelectOption>
        {children}
      </NativeSelect>
    </div>
  )
}
