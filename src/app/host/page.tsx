import { Suspense } from "react"
import HostPage from "@/views/host"

export default function Page() {
  return (
    <Suspense>
      <HostPage />
    </Suspense>
  )
}
