"use client"

import { InfoIcon } from "@phosphor-icons/react"
import { useAuth } from "@/lib/auth"
import { GUEST_UNAVAILABLE_MESSAGE } from "@/lib/use-writer"

/** Shown only when anonymous sign-in failed, so guests understand why saving won't work. */
export function GuestNotice() {
  const { status, error } = useAuth()
  if (status !== "unavailable") return null
  return (
    <div role="status" className="paper flex items-start gap-3 border-ochre bg-ochre/15 p-4 text-sm">
      <InfoIcon weight="duotone" className="mt-0.5 size-5 shrink-0 text-wine" />
      <div>
        <p className="font-semibold">You can browse, but saving is switched off.</p>
        <p className="text-muted-foreground">{GUEST_UNAVAILABLE_MESSAGE}</p>
        {error && <p className="mt-1 text-xs text-muted-foreground">Details: {error}</p>}
      </div>
    </div>
  )
}
