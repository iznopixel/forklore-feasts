import { Suspense } from "react"
import EventFormPage from "@/views/event-form"

export default function Page() {
  return (
    <Suspense>
      <EventFormPage />
    </Suspense>
  )
}
