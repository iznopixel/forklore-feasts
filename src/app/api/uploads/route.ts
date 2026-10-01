import { ApiError, MEDIA_BUCKET, check, handle, ok, requireUser, supabaseFor } from "@/server/supabase"

const MAX_BYTES = 5 * 1024 * 1024

/** multipart/form-data with a `file` field. Stores at <auth-user-id>/<filename>; returns { path }. */
export const POST = handle(async (req: Request) => {
  const sb = supabaseFor(req)
  const user = await requireUser(req, sb)
  const form = await req.formData()
  const file = form.get("file")
  if (!(file instanceof File)) throw new ApiError(400, "Attach an image as `file`.")
  if (!file.type.startsWith("image/")) throw new ApiError(415, "Only image files can be uploaded.")
  if (file.size > MAX_BYTES) throw new ApiError(413, "That photo is over 5 MB.")

  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg"
  const base =
    file.name
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "photo"
  const path = `${user.id}/${Date.now()}-${base}.${ext}`
  check(
    await sb.storage.from(MEDIA_BUCKET).upload(path, file, { contentType: file.type, upsert: false })
  )
  return ok({ path }, 201)
})
