"use client"

import { useRouter } from "next/navigation"
import * as React from "react"

import { LoadingState } from "@/components/feedback/loading-state"
import { useAuth } from "@/lib/auth/auth-context"

export function AuthRedirect({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { status } = useAuth()

  React.useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard")
    }
  }, [router, status])

  if (status === "loading") {
    return (
      <LoadingState
        className="min-h-svh"
        title="Checking session"
        message="Preparing your sign-in options."
      />
    )
  }

  if (status === "authenticated") {
    return null
  }

  return children
}
