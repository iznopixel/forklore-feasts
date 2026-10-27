import type { Event } from "@/lib/types"

/** Events have a start time but no end, so calendars get a supper-sized window. */
const DEFAULT_HOURS = 3

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")

const escapeText = (s: string) => s.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/([,;])/g, "\\$1")

/** RFC 5545 asks for lines of at most 75 octets; continuation lines start with a space. */
function fold(line: string): string {
  const bytes = new TextEncoder()
  const chunks: string[] = []
  let current = ""
  for (const ch of line) {
    const limit = chunks.length === 0 ? 75 : 74
    if (bytes.encode(current + ch).length > limit) {
      chunks.push(current)
      current = ch
    } else {
      current += ch
    }
  }
  chunks.push(current)
  return chunks.join("\r\n ")
}

export function eventIcs(event: Pick<Event, "id" | "title" | "theme" | "description" | "starts_at">, pageUrl: string): string {
  const start = new Date(event.starts_at)
  const end = new Date(start.getTime() + DEFAULT_HOURS * 60 * 60 * 1000)
  const blurb = [event.theme, event.description].filter(Boolean).join("\n\n")
  const description = [blurb, `RSVP and add what you’re bringing: ${pageUrl}`].filter(Boolean).join("\n\n")

  return (
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Forklore Feasts//Gatherings//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${event.id}@forklore-feasts`,
      `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${escapeText(event.title)}`,
      `DESCRIPTION:${escapeText(description)}`,
      `URL:${pageUrl}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ]
      .map(fold)
      .join("\r\n") + "\r\n"
  )
}

/** Hands the browser an .ics file: phones offer their calendar app, desktops download it. */
export function downloadEventIcs(event: Pick<Event, "id" | "title" | "slug" | "theme" | "description" | "starts_at">) {
  const pageUrl = new URL(`/events/${event.slug}`, window.location.origin).href
  const blob = new Blob([eventIcs(event, pageUrl)], { type: "text/calendar;charset=utf-8" })
  const href = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = href
  a.download = `${event.slug}.ics`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(href), 1000)
}
