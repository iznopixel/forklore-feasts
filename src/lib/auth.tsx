"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { Session } from "@supabase/supabase-js"
import { getCaptchaToken } from "@/lib/captcha"
import { isSupabaseConfigured, supabase } from "@/lib/supabase"

type AuthStatus = "loading" | "ready" | "unavailable"

interface AuthValue {
  status: AuthStatus
  session: Session | null
  userId: string | null
  /** Reason guest sign-in failed, when status is "unavailable". */
  error: string | null
  /** True for guests; false once someone has signed in with an email. */
  isGuest: boolean
  email: string | null
  /** Try again to get a guest session; resolves to the session if it worked. */
  ensureSession: () => Promise<Session | null>
  /** Emails a one-time sign-in link for hosts. Throws with a readable message on failure. */
  sendHostLink: (email: string) => Promise<void>
  /** Signs out and drops back to a fresh guest session. */
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

/**
 * Guests never see a login flow. If there is no session on startup we quietly
 * sign in anonymously so RLS can track who owns which dishes and recipes.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<AuthStatus>("loading")
  const [error, setError] = useState<string | null>(null)

  const ensureSession = useCallback(async () => {
    if (!isSupabaseConfigured) return null
    const {
      data: { session: existing },
    } = await supabase.auth.getSession()
    if (existing) {
      setSession(existing)
      setStatus("ready")
      setError(null)
      return existing
    }
    let captchaToken: string | undefined
    try {
      captchaToken = await getCaptchaToken()
    } catch (e) {
      setSession(null)
      setStatus("unavailable")
      setError(e instanceof Error ? e.message : "Captcha check failed.")
      return null
    }
    const { data, error: signInError } = await supabase.auth.signInAnonymously({
      options: captchaToken ? { captchaToken } : undefined,
    })
    if (signInError || !data.session) {
      setSession(null)
      setStatus("unavailable")
      setError(signInError?.message ?? "Could not start a guest session.")
      return null
    }
    setSession(data.session)
    setStatus("ready")
    setError(null)
    return data.session
  }, [])

  const sendHostLink = useCallback(async (email: string) => {
    let captchaToken: string | undefined
    try {
      captchaToken = await getCaptchaToken()
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : "Captcha check failed.")
    }
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/host`,
        ...(captchaToken ? { captchaToken } : {}),
      },
    })
    if (otpError) throw new Error(otpError.message)
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setSession(null)
    await ensureSession()
  }, [ensureSession])

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      if (next) {
        setStatus("ready")
        setError(null)
      }
    })
    void ensureSession()
    return () => sub.subscription.unsubscribe()
  }, [ensureSession])

  const value = useMemo<AuthValue>(
    () => ({
      status,
      session,
      userId: session?.user.id ?? null,
      error,
      isGuest: session?.user.is_anonymous ?? true,
      email: session?.user.email ?? null,
      ensureSession,
      sendHostLink,
      signOut,
    }),
    [status, session, error, ensureSession, sendHostLink, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>")
  return ctx
}
