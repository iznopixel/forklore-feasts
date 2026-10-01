/**
 * Cloudflare Turnstile, loaded on demand. Supabase verifies the token when
 * "Enable Captcha protection" is on (Auth → Attack Protection).
 * `interaction-only` keeps it invisible unless Cloudflare wants a challenge.
 */
export const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

interface TurnstileApi {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string
  remove: (id: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

let scriptPromise: Promise<TurnstileApi> | null = null

function loadScript(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  scriptPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement("script")
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
    s.async = true
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Captcha failed to load.")))
    s.onerror = () => {
      scriptPromise = null
      reject(new Error("Captcha failed to load."))
    }
    document.head.appendChild(s)
  })
  return scriptPromise
}

/** Resolves a fresh captcha token, or undefined when no site key is configured. */
export async function getCaptchaToken(): Promise<string | undefined> {
  if (!turnstileSiteKey) return undefined
  const api = await loadScript()
  const el = document.createElement("div")
  el.style.cssText = "position:fixed;bottom:16px;right:16px;z-index:50"
  document.body.appendChild(el)
  return new Promise<string>((resolve, reject) => {
    const cleanup = (id: string) => {
      api.remove(id)
      el.remove()
    }
    const id = api.render(el, {
      sitekey: turnstileSiteKey,
      appearance: "interaction-only",
      callback: (token: string) => {
        resolve(token)
        cleanup(id)
      },
      "error-callback": () => {
        reject(new Error("Captcha check failed."))
        cleanup(id)
      },
    })
  })
}
