"use client"

import type { ReactNode } from "react"
import { CookingPotIcon, WarningIcon } from "@phosphor-icons/react"
import { Annotation } from "@/components/cookbook/ornaments"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function EmptyNote({
  title,
  children,
  action,
  className,
}: {
  title: string
  children?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("paper mx-auto max-w-xl border-dashed px-6 py-10 text-center", className)}>
      <CookingPotIcon weight="duotone" className="mx-auto mb-3 size-12 text-tomato" />
      <h3 className="font-heading text-2xl font-bold">{title}</h3>
      {children && <p className="mx-auto mt-2 max-w-md text-muted-foreground">{children}</p>}
      <Annotation className="mt-3 block" rotate={-2}>nothing on the table yet</Annotation>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="paper mx-auto max-w-xl border-destructive/60 px-6 py-8 text-center">
      <WarningIcon weight="duotone" className="mx-auto mb-2 size-9 text-destructive" />
      <p className="font-heading text-xl font-bold">The kitchen hit a snag</p>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

export function CardSkeletons({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid gap-6 sm:grid-cols-2 lg:grid-cols-3", className)} aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="paper h-64 animate-pulse bg-muted/60" />
      ))}
    </div>
  )
}
