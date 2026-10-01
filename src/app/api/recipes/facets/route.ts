import { check, handle, ok, supabaseFor } from "@/server/supabase"

export const GET = handle(async (req: Request) => {
  const rows = check(await supabaseFor(req).from("recipes").select("category, tags, contributor_name"))
  const categories = new Set<string>()
  const tags = new Set<string>()
  const contributors = new Set<string>()
  for (const r of rows ?? []) {
    if (r.category) categories.add(r.category)
    for (const t of r.tags ?? []) tags.add(t)
    if (r.contributor_name) contributors.add(r.contributor_name)
  }
  const sort = (s: Set<string>) => [...s].sort((a, b) => a.localeCompare(b))
  return ok({ categories: sort(categories), tags: sort(tags), contributors: sort(contributors) })
})
