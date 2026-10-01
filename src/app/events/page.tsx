import { Suspense } from "react"
import EventsPage from "@/views/events"

export default function Page() {
  return (
    <Suspense>
      <EventsPage />
    </Suspense>
  )
}
