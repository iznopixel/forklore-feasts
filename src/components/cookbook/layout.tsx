"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BookOpenTextIcon,
  CalendarBlankIcon,
  ForkKnifeIcon,
  ListIcon,
  PlusIcon,
  HouseLineIcon,
} from "@phosphor-icons/react"
import { Annotation, Flourish, Sparkle } from "@/components/cookbook/ornaments"
import { buttonVariants } from "@/components/ui/button"
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"
import { isSupabaseConfigured } from "@/lib/supabase"

const NAV = [
  { to: "/", label: "Home", icon: HouseLineIcon, end: true },
  { to: "/events", label: "Gatherings", icon: CalendarBlankIcon, end: false },
  { to: "/recipes", label: "Recipes", icon: BookOpenTextIcon, end: false },
]


function NavLink({
  to,
  end,
  className,
  children,
}: {
  to: string
  end?: boolean
  className: (s: { isActive: boolean }) => string
  children?: ReactNode
}) {
  const pathname = usePathname()
  const isActive = end ? pathname === to : pathname === to || pathname.startsWith(to + "/")
  return (
    <Link href={to} className={className({ isActive })} aria-current={isActive ? "page" : undefined}>
      {children}
    </Link>
  )
}

function Wordmark({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("group flex items-center gap-3", className)} aria-label="Forklore Feasts — home">
      <span className="grid size-11 -rotate-6 place-items-center rounded-full border-2 border-wine bg-tomato text-paper shadow-[2px_2px_0_var(--wine)] transition-transform group-hover:rotate-3">
        <ForkKnifeIcon weight="fill" className="size-6" />
      </span>
      <span className="leading-none">
        <span className="display block text-[2.15rem] text-foreground">Forklore</span>
        <span className="mt-0.5 block text-[0.68rem] font-bold tracking-[0.34em] text-wine uppercase">Feasts</span>
      </span>
    </Link>
  )
}


export function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  useEffect(() => setOpen(false), [pathname])

  return (
    <div className="flex min-h-svh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-paper focus:p-3">
        Skip to content
      </a>
      <header className="relative z-20 border-b-[3px] border-double border-foreground/70 bg-background/90">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Wordmark />
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {NAV.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    "px-3 py-2 font-heading text-lg font-semibold underline-offset-[10px] hover:text-tomato",
                    isActive && "link-underline text-tomato"
                  )
                }
              >
                {label}
              </NavLink>
            ))}
            <Link href="/recipes/new" className={cn(buttonVariants(), "ml-3")}>
              <PlusIcon weight="bold" />
              Add a recipe
            </Link>
          </nav>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              className={cn(buttonVariants({ variant: "outline", size: "icon" }), "md:hidden")}
              aria-label="Open menu"
            >
              <ListIcon weight="bold" />
            </SheetTrigger>
            <SheetContent side="right" className="bg-paper">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <div className="p-6 pt-8">
                <Wordmark />
              </div>
              <Flourish className="mx-6 text-wine" />
              <nav aria-label="Mobile" className="flex flex-col p-4">
                {NAV.map(({ to, label, icon: Icon, end }) => (
                  <SheetClose
                    key={to}
                    render={
                      <NavLink
                        to={to}
                        end={end}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 border-b border-dashed border-border px-2 py-4 font-heading text-2xl font-bold",
                            isActive && "text-tomato"
                          )
                        }
                      />
                    }
                  >
                    <Icon weight="duotone" className="size-6 text-wine" />
                    {label}
                  </SheetClose>
                ))}
              </nav>
              <div className="mt-auto p-6">
                <SheetClose
                  render={
                    <Link href="/recipes/new" className={cn(buttonVariants({ size: "lg" }), "w-full")} />
                  }
                >
                  <PlusIcon weight="bold" /> Add a recipe
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {!isSupabaseConfigured && (
        <div role="alert" className="bg-destructive px-4 py-2 text-center text-sm text-white">
          Supabase isn’t configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local.
        </div>
      )}

      <main id="main" className="flex-1">
        {children}
      </main>

      <footer className="grain relative mt-24 bg-[#2c3025] text-[#f4eedc]">
        <div className="relative z-[1] mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <Flourish className="mb-8 text-[#e7aead]" />
          <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-end">
            <div>
              <p className="display text-5xl text-[#f4eedc]">Come hungry.</p>
              <p className="display text-5xl text-[#e7aead]">Bring something good.</p>
              <Annotation className="mt-3 block text-[#d4b04a]" rotate={-2}>
                a neighborhood potluck cookbook, written by everyone
              </Annotation>
            </div>
            <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 font-heading text-lg font-semibold">
              {NAV.map(({ to, label }) => (
                <Link key={to} href={to} className="hover:text-[#d4b04a]">{label}</Link>
              ))}
              <Link href="/recipes/new" className="hover:text-[#d4b04a]">Add a recipe</Link>
              <Link href="/host" className="hover:text-[#d4b04a]">Hosts</Link>
            </nav>
          </div>
          <p className="mt-10 flex items-center gap-2 text-sm opacity-80">
            <Sparkle className="size-3" /> Forklore Feasts · set the table, share the recipe
          </p>
        </div>
      </footer>
      <Toaster />
    </div>
  )
}
