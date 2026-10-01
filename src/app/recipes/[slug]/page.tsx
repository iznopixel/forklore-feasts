import { Suspense } from "react"
import RecipeDetailPage from "@/views/recipe-detail"

export default function Page() {
  return (
    <Suspense>
      <RecipeDetailPage />
    </Suspense>
  )
}
