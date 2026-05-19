"use client"

import { useRouter } from "next/navigation"
import * as React from "react"

import { LoadingState } from "@/components/feedback/loading-state"
import { useAuth } from "@/lib/auth/auth-context"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { status } = useAuth()

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login")
    }
  }, [router, status])

  if (status === "loading") {
    return (
      <LoadingState
        className="min-h-svh"
        title="Checking session"
        message="Verifying your workspace access."
      />
    )
  }

  if (status === "unauthenticated") {
    return null
  }

  return children
}
