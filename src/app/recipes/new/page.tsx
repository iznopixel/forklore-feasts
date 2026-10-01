import { Suspense } from "react"
import RecipeFormPage from "@/views/recipe-form"

export default function Page() {
  return (
    <Suspense>
      <RecipeFormPage />
    </Suspense>
  )
}
