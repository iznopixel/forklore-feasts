"use client"

import { useEffect, useState, type FormEvent } from "react"
import { toast } from "sonner"
import { BookOpenTextIcon, CookingPotIcon } from "@phosphor-icons/react"
import { FormField } from "@/components/cookbook/form-field"
import { GuestNotice } from "@/components/cookbook/guest-notice"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { createDish, updateDish } from "@/lib/api"
import { DISH_CATEGORIES } from "@/lib/taxonomy"
import type { Dish, Event } from "@/lib/types"
import { getSavedName, saveName, useRequireUser } from "@/lib/use-writer"

export function DishDialog({
  event,
  dish,
  open,
  onOpenChange,
  onSaved,
  past,
}: {
  event: Pick<Event, "id" | "title">
  dish?: Dish | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** `writeRecipe` is true when the guest chose "save & add the recipe". */
  onSaved: (dish: Dish, writeRecipe: boolean) => void
  past?: boolean
}) {
  const requireUser = useRequireUser()
  const [name, setName] = useState("")
  const [who, setWho] = useState("")
  const [category, setCategory] = useState("")
  const [note, setNote] = useState("")
  const [errors, setErrors] = useState<{ name?: string; who?: string }>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(dish?.name ?? "")
    setWho(dish?.contributor_name ?? getSavedName())
    setCategory(dish?.category ?? "")
    setNote(dish?.note ?? "")
    setErrors({})
  }, [open, dish])

  async function submit(writeRecipe: boolean) {
    const next = {
      name: name.trim() ? undefined : "Tell us what you’re bringing.",
      who: who.trim() ? undefined : "Add your name so people know who to thank.",
    }
    setErrors(next)
    if (next.name || next.who) return
    setSaving(true)
    try {
      if (!(await requireUser())) return
      saveName(who.trim())
      const fields = {
        contributor_name: who.trim(),
        name: name.trim(),
        category: category || null,
        note: note.trim() || null,
      }
      let saved: Dish
      if (dish) {
        await updateDish(dish.id, fields)
        saved = { ...dish, ...fields }
      } else {
        saved = (await createDish({ event_id: event.id, ...fields })) as Dish
      }
      toast.success(dish ? "Dish updated." : "Added to the table!")
      onOpenChange(false)
      onSaved(saved, writeRecipe)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn’t save that dish.")
    } finally {
      setSaving(false)
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void submit(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-3xl font-bold">
            {dish ? "Edit your dish" : past ? "What did you bring?" : "What are you bringing?"}
          </DialogTitle>
          <DialogDescription>
            For {event.title}. A recipe is optional — you can always add it later.
          </DialogDescription>
        </DialogHeader>
        <GuestNotice />
        <form onSubmit={onSubmit} className="grid gap-5" noValidate>
          <FormField id="dish-name" label="Dish" required error={errors.name}>
            <Input id="dish-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Grandma’s scalloped potatoes" aria-invalid={!!errors.name} autoFocus />
          </FormField>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField id="dish-who" label="Your name" required error={errors.who}>
              <Input id="dish-who" value={who} onChange={(e) => setWho(e.target.value)} placeholder="Rosa" aria-invalid={!!errors.who} autoComplete="given-name" />
            </FormField>
            <FormField id="dish-cat" label="Kind of dish">
              <NativeSelect id="dish-cat" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full">
                <NativeSelectOption value="">Not sure yet</NativeSelectOption>
                {DISH_CATEGORIES.map((c) => (
                  <NativeSelectOption key={c} value={c}>{c}</NativeSelectOption>
                ))}
              </NativeSelect>
            </FormField>
          </div>
          <FormField id="dish-note" label="A little note" hint="Serves 8, contains walnuts, needs an oven slot…">
            <Textarea id="dish-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </FormField>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            {!dish && (
              <Button type="button" variant="outline" disabled={saving} onClick={() => void submit(true)}>
                <BookOpenTextIcon weight="bold" /> Save &amp; write up the recipe
              </Button>
            )}
            <Button type="submit" disabled={saving}>
              <CookingPotIcon weight="fill" /> {saving ? "Saving…" : dish ? "Save changes" : "Add my dish"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
