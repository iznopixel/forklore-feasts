import { ApiError, MEDIA_BUCKET, handle, ok, readJson, requireUser, supabaseFor } from "@/server/supabase"
import { fetchRecipeImage, importRecipeFromUrl } from "@/server/recipe-import"

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" }

/** { url } -> a recipe draft read from the page's structured data, with its photo copied to our storage. */
export const POST = handle(async (req: Request) => {
  const sb = supabaseFor(req)
  const user = await requireUser(req, sb)
  const { url } = await readJson<{ url?: unknown }>(req)
  if (typeof url !== "string" || !url.trim()) throw new ApiError(400, "Paste a recipe link first.")
  const { image_url, ...draft } = await importRecipeFromUrl(url.trim())

  // The photo is a nice-to-have: any failure just means no picture.
  let image_path: string | null = null
  const image = image_url ? await fetchRecipeImage(image_url) : null
  if (image) {
    const path = `${user.id}/${Date.now()}-imported.${EXT[image.type]}`
    const { error } = await sb.storage.from(MEDIA_BUCKET).upload(path, image.bytes, { contentType: image.type, upsert: false })
    if (!error) image_path = path
  }
  return ok({ ...draft, image_path })
})
