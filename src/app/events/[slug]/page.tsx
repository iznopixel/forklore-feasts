import { Suspense } from "react"
import EventDetailPage from "@/views/event-detail"

export default function Page() {
  return (
    <Suspense>
      <EventDetailPage />
    </Suspense>
  )
}
