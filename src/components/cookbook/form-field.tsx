"use client"

import type { ReactNode } from "react"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export function FormField({
  id,
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  id: string
  label: string
  hint?: string
  error?: string | null
  required?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id} className="text-[0.8rem] font-bold tracking-[0.1em] uppercase">
        {label}
        {required && <span aria-hidden="true" className="text-tomato">*</span>}
        {!required && <span className="font-hand text-lg font-normal tracking-normal text-muted-foreground normal-case">optional</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-sm text-muted-foreground">{hint}</p>}
      {error && <p role="alert" className="text-sm font-semibold text-destructive">{error}</p>}
    </div>
  )
}
