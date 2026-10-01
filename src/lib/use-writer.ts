import { useCallback } from "react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth"

export const GUEST_UNAVAILABLE_MESSAGE =
  "Guest sign-in isn’t available right now, so changes can’t be saved. (The host needs to enable anonymous sign-ins in Supabase Auth.)"

/** Resolves the current guest's user id, retrying sign-in once; toasts if impossible. */
export function useRequireUser() {
  const { userId, ensureSession } = useAuth()
  return useCallback(async (): Promise<string | null> => {
    if (userId) return userId
    const session = await ensureSession()
    if (!session) {
      toast.error(GUEST_UNAVAILABLE_MESSAGE)
      return null
    }
    return session.user.id
  }, [userId, ensureSession])
}

const NAME_KEY = "forklore:contributor-name"

export function getSavedName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? ""
  } catch {
    return ""
  }
}

export function saveName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name)
  } catch {
    /* private mode: fine */
  }
}
