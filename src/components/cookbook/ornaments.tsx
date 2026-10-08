"use client"

import type { ComponentProps, ReactNode } from "react"
import { CrownSimpleIcon, StarIcon } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

/** Little four-point sparkle, like a printer's dingbat. */
export function Sparkle({ className, ...props }: ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("size-4", className)} {...props}>
      <path
        fill="currentColor"
        d="M12 0c.9 6.2 2.6 9.9 5.2 11 2.2.7 4.5 1 6.8 1-2.3 0-4.6.3-6.8 1-2.6 1.1-4.3 4.8-5.2 11-.9-6.2-2.6-9.9-5.2-11C4.6 12.3 2.3 12 0 12c2.3 0 4.6-.3 6.8-1C9.4 9.9 11.1 6.2 12 0Z"
      />
    </svg>
  )
}

/** Centered divider: rule — sparkle — rule. */
export function Flourish({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 text-current", className)} aria-hidden="true">
      <span className="h-px flex-1 bg-current opacity-50" />
      <Sparkle className="size-3 opacity-80" />
      <StarIcon weight="fill" className="size-4" />
      <Sparkle className="size-3 opacity-80" />
      <span className="h-px flex-1 bg-current opacity-50" />
    </div>
  )
}

/** A wobbly hand-drawn underline. */
export function Squiggle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 10" preserveAspectRatio="none" aria-hidden="true" className={cn("h-2.5 w-28", className)} fill="none">
      <path d="M2 6c10-6 14 4 24-1s14 4 24-1 14 4 24-1 14 4 24-1 10 2 18 0" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

/** Handwritten margin note. */
export function Annotation({
  children,
  className,
  rotate = -3,
}: {
  children: ReactNode
  className?: string
  rotate?: number
}) {
  return (
    <span
      className={cn("font-hand inline-block text-[1.35rem] leading-none text-accent", className)}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      {children}
    </span>
  )
}

/** Cookbook-style chapter heading. */
export function SectionHeader({
  kicker,
  title,
  action,
  className,
  as: Tag = "h2",
}: {
  kicker?: string
  title: ReactNode
  action?: ReactNode
  className?: string
  as?: "h1" | "h2" | "h3"
}) {
  return (
    <header className={cn("mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-3", className)}>
      <div>
        {kicker && <Annotation className="mb-3 block" rotate={-2}>{kicker}</Annotation>}
        <Tag className="display text-[clamp(2.75rem,6.5vw,4.75rem)] text-foreground">{title}</Tag>
        <Squiggle className="mt-3 text-tomato" />
      </div>
      {action}
    </header>
  )
}

/** Round rubber-stamp used for dates and badges. */
export function Stamp({
  children,
  className,
  rotate = -6,
}: {
  children: ReactNode
  className?: string
  rotate?: number
}) {
  return (
    <div
      className={cn(
        "inline-flex flex-col items-center justify-center rounded-full border-2 border-current text-center font-heading leading-none uppercase",
        className
      )}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      {children}
    </div>
  )
}

/** Solid ink stamp pressed onto a card to mark an event's winning recipe. */
export function CrownStamp({ className, label = "Winner" }: { className?: string; label?: string }) {
  return (
    <div
      role="img"
      aria-label={`${label} of the gathering`}
      className={cn(
        "flex size-[4.5rem] rotate-[10deg] flex-col items-center justify-center rounded-full bg-tomato text-background shadow-[0_2px_5px_rgb(60_40_20/0.35)] outline-[1.5px] -outline-offset-[5px] outline-background/70",
        className
      )}
    >
      <CrownSimpleIcon weight="fill" aria-hidden="true" className="size-7" />
      <span className="mt-0.5 text-[0.55rem] leading-none font-bold tracking-[0.22em] uppercase">{label}</span>
    </div>
  )
}
