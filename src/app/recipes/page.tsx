import { Suspense } from "react"
import RecipesPage from "@/views/recipes"

export default function Page() {
  return (
    <Suspense>
      <RecipesPage />
    </Suspense>
  )
}
