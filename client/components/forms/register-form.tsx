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

export function RegisterForm() {
  const router = useRouter()
  const { register } = useAuth()
  const emailRef = React.useRef<HTMLInputElement>(null)
  const passwordRef = React.useRef<HTMLInputElement>(null)
  const [name, setName] = React.useState("")
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
    const nextPasswordError =
      password.length >= 8 ? null : "Use at least 8 characters."
    setEmailError(nextEmailError)
    setPasswordError(nextPasswordError)

    if (nextEmailError || nextPasswordError) {
      if (nextEmailError) emailRef.current?.focus()
      else passwordRef.current?.focus()
      return
    }

    setIsSubmitting(true)

    try {
      await register({
        ...(name.trim() ? { name: name.trim() } : {}),
        email,
        password,
      })
      router.replace("/dashboard")
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : "Unable to create an account right now."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      {error ? (
        <Notice title="Registration failed" tone="destructive">
          {error}
        </Notice>
      ) : null}
      <AuthField
        helper="Optional."
        id="register-name"
        label="Name"
      >
        <Input
          id="register-name"
          type="text"
          autoComplete="name"
          placeholder="Your name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </AuthField>
      <AuthField error={emailError} id="register-email" label="Email">
        <Input
          aria-describedby={emailError ? "register-email-error" : undefined}
          aria-invalid={!!emailError}
          id="register-email"
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
        helper="Use at least 8 characters."
        id="register-password"
        label="Password"
      >
        <Input
          aria-describedby={
            passwordError ? "register-password-error" : "register-password-help"
          }
          aria-invalid={!!passwordError}
          id="register-password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          minLength={8}
          ref={passwordRef}
          value={password}
          onChange={(event) => {
            setPassword(event.target.value)
            setPasswordError(null)
          }}
        />
      </AuthField>
      <Button
        type="submit"
        size="lg"
        className="h-11 w-full text-sm"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Creating account" : "Create account"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground underline">
          Sign in
        </Link>
      </p>
    </form>
  )
}
