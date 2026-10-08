import "server-only"
import { lookup } from "node:dns/promises"
import { isIP } from "node:net"
import { ApiError } from "@/server/supabase"

export interface ImportedRecipe {
  name: string
  description: string | null
  ingredients: string[]
  instructions: string[]
  prep_time_minutes: number | null
  cook_time_minutes: number | null
  servings: number | null
  source_url: string
  /** Absolute URL of the recipe's photo on the original site, if it has one. */
  image_url: string | null
}

const MAX_BYTES = 3 * 1024 * 1024
const MAX_REDIRECTS = 4

/* ------------------------------ Fetching ------------------------------ */

function isPrivateIp(ip: string): boolean {
  if (ip.includes(":")) {
    const v = ip.toLowerCase()
    if (v.startsWith("::ffff:")) return isPrivateIp(v.slice(7))
    return v === "::1" || v === "::" || /^f[cd]/.test(v) || /^fe[89ab]/.test(v)
  }
  const [a, b] = ip.split(".").map(Number)
  return (
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  )
}

/** Refuses anything that could point at our own network. */
async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new ApiError(400, "That doesn’t look like a web address.")
  }
  if (!/^https?:$/.test(url.protocol)) throw new ApiError(400, "Recipe links must start with http:// or https://.")
  const host = url.hostname.replace(/^\[|\]$/g, "")
  const addrs = isIP(host) ? [host] : (await lookup(host, { all: true }).catch(() => [])).map((a) => a.address)
  if (addrs.length === 0) throw new ApiError(422, "We couldn’t find that website.")
  if (addrs.some(isPrivateIp)) throw new ApiError(400, "That address isn’t a public web page.")
  return url
}

async function safeFetch(
  raw: string,
  { accept, maxBytes, truncate }: { accept: string; maxBytes: number; truncate: boolean }
): Promise<{ bytes: Buffer; type: string; finalUrl: string }> {
  let url = await assertPublicUrl(raw)
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ForkloreFeasts/1.0; recipe importer)", Accept: accept },
    }).catch(() => {
      throw new ApiError(502, "That page didn’t answer. Try again, or paste the recipe in by hand.")
    })
    const loc = res.headers.get("location")
    if (res.status >= 300 && res.status < 400 && loc) {
      url = await assertPublicUrl(new URL(loc, url).toString())
      continue
    }
    if (!res.ok) throw new ApiError(502, `That site said no (${res.status}). Paste the recipe in by hand instead.`)
    const type = res.headers.get("content-type") ?? ""

    const reader = res.body?.getReader()
    if (!reader) throw new ApiError(502, "That page came back empty.")
    const chunks: Uint8Array[] = []
    let total = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.length
      if (total > maxBytes) {
        await reader.cancel()
        if (truncate) break
        throw new ApiError(413, "That file is too big.")
      }
      chunks.push(value)
    }
    return { bytes: Buffer.concat(chunks), type, finalUrl: url.toString() }
  }
  throw new ApiError(502, "That link redirected too many times.")
}

async function fetchHtml(raw: string): Promise<{ html: string; finalUrl: string }> {
  const { bytes, type, finalUrl } = await safeFetch(raw, {
    accept: "text/html,application/xhtml+xml",
    maxBytes: MAX_BYTES,
    truncate: true,
  })
  if (type && !/html|xml/i.test(type)) throw new ApiError(415, "That link isn’t a web page.")
  return { html: bytes.toString("utf8"), finalUrl }
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024

/** Downloads the recipe photo. Returns null when it's missing, not an image, or too big. */
export async function fetchRecipeImage(url: string): Promise<{ bytes: Buffer; type: string } | null> {
  try {
    const { bytes, type } = await safeFetch(url, { accept: "image/*", maxBytes: MAX_IMAGE_BYTES, truncate: false })
    const mime = type.split(";")[0].trim().toLowerCase()
    return /^image\/(jpeg|png|webp|gif|avif)$/.test(mime) && bytes.length > 0 ? { bytes, type: mime } : null
  } catch {
    return null
  }
}

/* ------------------------------ Parsing ------------------------------ */

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—",
  rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", frac12: "½", frac14: "¼", frac34: "¾", deg: "°", hellip: "…",
}

function decode(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z0-9]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m)
}

/** Plain text from a possibly-HTML string. */
function clean(v: unknown): string {
  if (typeof v !== "string") return ""
  return decode(v.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " "))
    .replace(/[ \t\r\f\v ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .trim()
}

const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : v == null ? [] : [v])

function isRecipeNode(n: unknown): n is Record<string, unknown> {
  if (!n || typeof n !== "object") return false
  return asArray((n as Record<string, unknown>)["@type"]).some((t) => String(t).toLowerCase() === "recipe")
}

function findRecipe(node: unknown): Record<string, unknown> | null {
  if (Array.isArray(node)) {
    for (const n of node) {
      const r = findRecipe(n)
      if (r) return r
    }
    return null
  }
  if (!node || typeof node !== "object") return null
  if (isRecipeNode(node)) return node
  const obj = node as Record<string, unknown>
  return findRecipe(obj["@graph"]) ?? findRecipe(obj.mainEntity) ?? findRecipe(obj.mainEntityOfPage)
}

function extractJsonLd(html: string): Record<string, unknown> | null {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  for (const m of html.matchAll(re)) {
    try {
      const found = findRecipe(JSON.parse(m[1].trim()))
      if (found) return found
    } catch {
      /* some sites ship malformed blocks; keep looking */
    }
  }
  return null
}

function instructionSteps(v: unknown): string[] {
  if (typeof v === "string") {
    const text = clean(v)
    return text.split("\n").map((l) => l.trim()).filter(Boolean)
  }
  const out: string[] = []
  for (const item of asArray(v)) {
    if (typeof item === "string") out.push(...instructionSteps(item))
    else if (item && typeof item === "object") {
      const o = item as Record<string, unknown>
      if (o.itemListElement) out.push(...instructionSteps(o.itemListElement))
      else out.push(...instructionSteps(o.text ?? o.name))
    }
  }
  return out
}

/** ISO-8601 duration ("PT1H15M", "P0DT30M") to minutes. */
function minutes(v: unknown): number | null {
  if (typeof v !== "string") return null
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i.exec(v.trim())
  if (!m) return null
  const total = Number(m[1] ?? 0) * 1440 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) + Math.round(Number(m[4] ?? 0) / 60)
  return total > 0 ? total : null
}

function servingCount(v: unknown): number | null {
  const first = asArray(v).map((x) => String(x))[0] ?? ""
  const n = parseInt(/\d+/.exec(first)?.[0] ?? "", 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

function metaContent(html: string, prop: string): string {
  const tag = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*>`, "i").exec(html)?.[0]
  return clean(/content=["']([^"']*)["']/i.exec(tag ?? "")?.[1])
}

function imageUrl(v: unknown, base: string): string | null {
  for (const item of asArray(v)) {
    const candidate = typeof item === "string" ? item : item && typeof item === "object" ? (item as Record<string, unknown>).url : null
    if (typeof candidate === "string" && candidate.trim()) {
      try {
        return new URL(decode(candidate.trim()), base).toString()
      } catch {
        /* try the next one */
      }
    }
  }
  return null
}

export async function importRecipeFromUrl(raw: string): Promise<ImportedRecipe> {
  const { html, finalUrl } = await fetchHtml(raw)
  const r = extractJsonLd(html)
  const ingredients = r ? asArray(r.recipeIngredient ?? r.ingredients).map(clean).filter(Boolean) : []
  const instructions = r ? instructionSteps(r.recipeInstructions) : []
  if (!r || (ingredients.length === 0 && instructions.length === 0)) {
    throw new ApiError(422, "We couldn’t find a recipe on that page. Paste it in by hand instead.")
  }
  const title =
    clean(r.name) || metaContent(html, "og:title") || clean(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1])
  return {
    name: title.slice(0, 200),
    description: clean(r.description).slice(0, 2000) || null,
    ingredients,
    instructions,
    prep_time_minutes: minutes(r.prepTime),
    cook_time_minutes: minutes(r.cookTime) ?? (r.prepTime ? null : minutes(r.totalTime)),
    servings: servingCount(r.recipeYield),
    source_url: finalUrl,
    image_url: imageUrl(metaContent(html, "og:image"), finalUrl) ?? imageUrl(asArray(r.image).reverse(), finalUrl),
  }
}
