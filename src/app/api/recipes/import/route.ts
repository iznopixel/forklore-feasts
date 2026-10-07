import { ApiError, handle, ok, readJson, requireUser, supabaseFor } from "@/server/supabase"
import { importRecipeFromUrl } from "@/server/recipe-import"

/** { url } -> a recipe draft read from the page's structured data. Nothing is saved. */
export const POST = handle(async (req: Request) => {
  const sb = supabaseFor(req)
  await requireUser(req, sb)
  const { url } = await readJson<{ url?: unknown }>(req)
  if (typeof url !== "string" || !url.trim()) throw new ApiError(400, "Paste a recipe link first.")
  return ok(await importRecipeFromUrl(url.trim()))
})
