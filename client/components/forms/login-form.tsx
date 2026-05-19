"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import * as React from "react"

import { AuthField } from "@/components/forms/auth-field"
import { Notice } from "@/components/shared/notice"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ApiError } from "@/lib/api/types"
import { useAuth } from "@/lib/auth/auth-context"

function getEmailError(email: string) {
  if (!email.trim()) {
    return "Enter your email address."
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return "Enter a valid email address."
  }

  return null
}

export function LoginForm() {
  const router = useRouter()
  const { login } = useAuth()
  const emailRef = React.useRef<HTMLInputElement>(null)
  const passwordRef = React.useRef<HTMLInputElement>(null)
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [emailError, setEmailError] = React.useState<string | null>(null)
  const [passwordError, setPasswordError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const nextEmailError = getEmailError(email)
    const nextPasswordError = password ? null : "Enter your password."
    setEmailError(nextEmailError)
    setPasswordError(nextPasswordError)

    if (nextEmailError || nextPasswordError) {
      if (nextEmailError) emailRef.current?.focus()
      else passwordRef.current?.focus()
      return
    }

    setIsSubmitting(true)

    try {
      await login({ email, password })
      router.replace("/dashboard")
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : "Unable to sign in right now."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      {error ? (
        <Notice title="Log in failed" tone="destructive">
          {error}
        </Notice>
      ) : null}
      <AuthField error={emailError} id="login-email" label="Email">
        <Input
          aria-describedby={emailError ? "login-email-error" : undefined}
          aria-invalid={!!emailError}
          id="login-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          ref={emailRef}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
            setEmailError(null)
          }}
        />
      </AuthField>
      <AuthField
        error={passwordError}
        id="login-password"
        label="Password"
      >
        <Input
          aria-describedby={
            passwordError ? "login-password-error" : undefined
          }
          aria-invalid={!!passwordError}
          id="login-password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          ref={passwordRef}
          value={password}
          onChange={(event) => {
            setPassword(event.target.value)
            setPasswordError(null)
          }}
        />
        <Link
          href="/forgot-password"
          className="text-right text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Forgot password?
        </Link>
      </AuthField>
      <Button
        type="submit"
        size="lg"
        className="h-11 w-full text-sm"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Signing in" : "Log in"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Need an account?{" "}
        <Link
          href="/register"
          className="font-medium text-foreground underline"
        >
          Create one
        </Link>
      </p>
    </form>
  )
}
