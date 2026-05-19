"use client"

import { ErrorState } from "@/components/feedback/error-state"
import { Button } from "@/components/ui/button"

export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="flex min-h-svh items-center justify-center px-4">
      <ErrorState
        className="w-full max-w-md"
        message="The page could not be rendered."
        action={
          <Button type="button" variant="outline" onClick={reset}>
            Try again
          </Button>
        }
      />
    </main>
  )
}
