

import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { EmptyNote } from "@/components/cookbook/states"

export default function NotFoundPage() {
  return (
    <div className="px-4 py-24">
      <EmptyNote title="That page isn’t in the cookbook" action={<Link href="/" className={buttonVariants()}>Back to the table</Link>}>
        The link may be old, or the page may have moved.
      </EmptyNote>
    </div>
  )
}
