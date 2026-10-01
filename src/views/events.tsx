"use client"

import { SectionHeader } from "@/components/cookbook/ornaments"
import { PosterCard, StubCard } from "@/components/cookbook/event-cards"
import { CardSkeletons, EmptyNote, ErrorNote } from "@/components/cookbook/states"
import { fetchEvents } from "@/lib/api"
import { isUpcoming } from "@/lib/format"
import { useAsync } from "@/lib/use-async"

export default function EventsPage() {
  const { data, error, loading, reload } = useAsync(fetchEvents, [])
  const upcoming = (data ?? []).filter((e) => isUpcoming(e.starts_at))
  const past = (data ?? []).filter((e) => !isUpcoming(e.starts_at)).reverse()

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      {loading ? (
        <CardSkeletons count={2} />
      ) : error ? (
        <ErrorNote message={error} onRetry={reload} />
      ) : (
        <>
          <SectionHeader as="h1" kicker="mark your calendar" title="Upcoming gatherings" />
          {upcoming.length > 0 ? (
            <div className="grid gap-10 md:grid-cols-2">
              {upcoming.map((e, i) => (
                <PosterCard key={e.id} event={e} featured={i === 0} className={i % 2 ? "md:mt-10" : ""} />
              ))}
            </div>
          ) : (
            <EmptyNote title="Nothing on the calendar">No gatherings are scheduled yet. Check back soon.</EmptyNote>
          )}

          <div className="mt-24">
            <SectionHeader kicker="the guest book" title="Past gatherings" />
            {past.length > 0 ? (
              <div className="grid gap-5 md:grid-cols-2">
                {past.map((e) => (
                  <StubCard key={e.id} event={e} />
                ))}
              </div>
            ) : (
              <p className="font-heading text-xl text-muted-foreground italic">No past gatherings yet.</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
