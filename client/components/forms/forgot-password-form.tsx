"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
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

export function ForgotPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { requestPasswordReset, completePasswordReset } = useAuth()

  const tokenParam = searchParams.get("token")
  const isResetStep = !!tokenParam

  const emailRef = React.useRef<HTMLInputElement>(null)
  const tokenRef = React.useRef<HTMLInputElement>(null)
  const passwordRef = React.useRef<HTMLInputElement>(null)
  const confirmRef = React.useRef<HTMLInputElement>(null)

  const [requestEmail, setRequestEmail] = React.useState("")
  const [requestError, setRequestError] = React.useState<string | null>(null)
  const [requestSuccess, setRequestSuccess] = React.useState<string | null>(
    null
  )
  const [requestEmailError, setRequestEmailError] = React.useState<
    string | null
  >(null)
  const [requestingToken, setRequestingToken] = React.useState(false)
  const [tokenDisplay, setTokenDisplay] = React.useState<string | null>(null)

  const [resetToken, setResetToken] = React.useState(tokenParam || "")
  const [newPassword, setNewPassword] = React.useState("")
  const [newPasswordConfirm, setNewPasswordConfirm] = React.useState("")
  const [resetError, setResetError] = React.useState<string | null>(null)
  const [resetSuccess, setResetSuccess] = React.useState<string | null>(null)
  const [resetTokenError, setResetTokenError] = React.useState<string | null>(
    null
  )
  const [newPasswordError, setNewPasswordError] = React.useState<string | null>(
    null
  )
  const [confirmError, setConfirmError] = React.useState<string | null>(null)
  const [isResetting, setIsResetting] = React.useState(false)

  async function onRequestReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setRequestError(null)
    setRequestSuccess(null)
    setTokenDisplay(null)

    const emailError = getEmailError(requestEmail)
    setRequestEmailError(emailError)

    if (emailError) {
      emailRef.current?.focus()
      return
    }

    const email = requestEmail.trim().toLowerCase()
    setRequestingToken(true)

    try {
      const result = await requestPasswordReset(email)

      if (result.resetToken) {
        setTokenDisplay(result.resetToken)
        setRequestSuccess(
          "Reset token created. Use the development token below to continue."
        )
      } else {
        setRequestSuccess(
          "Password reset instructions have been sent if an account exists for that email."
        )
      }
    } catch (caughtError) {
      setRequestError(
        caughtError instanceof ApiError
          ? caughtError.message
          : "Unable to request password reset right now."
      )
    } finally {
      setRequestingToken(false)
    }
  }

  async function onCompleteReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setResetError(null)
    setResetSuccess(null)

    const tokenError = resetToken.trim() ? null : "Enter the reset token."
    const passwordError = !newPassword.trim()
      ? "Enter a new password."
      : newPassword.length < 8
        ? "Use at least 8 characters."
        : null
    const passwordConfirmError =
      newPassword && newPassword !== newPasswordConfirm
        ? "Passwords do not match."
        : !newPasswordConfirm
          ? "Confirm your new password."
          : null

    setResetTokenError(tokenError)
    setNewPasswordError(passwordError)
    setConfirmError(passwordConfirmError)

    if (tokenError || passwordError || passwordConfirmError) {
      if (tokenError) tokenRef.current?.focus()
      else if (passwordError) passwordRef.current?.focus()
      else confirmRef.current?.focus()
      return
    }

    setIsResetting(true)

    try {
      await completePasswordReset(resetToken.trim(), newPassword)
      setResetSuccess("Password reset. Redirecting to your dashboard.")

      setTimeout(() => {
        router.replace("/dashboard")
      }, 1500)
    } catch (caughtError) {
      setResetError(
        caughtError instanceof ApiError
          ? caughtError.message
          : "Unable to reset password right now."
      )
    } finally {
      setIsResetting(false)
    }
  }

  if (isResetStep) {
    return (
      <div className="grid gap-5">
        {resetError ? (
          <Notice title="Reset failed" tone="destructive">
            {resetError}
          </Notice>
        ) : null}
        {resetSuccess ? <Notice tone="success">{resetSuccess}</Notice> : null}

        {!resetSuccess ? (
          <form className="grid gap-5" onSubmit={onCompleteReset}>
            <AuthField
              error={resetTokenError}
              id="reset-token"
              label="Reset token"
            >
              <Input
                aria-describedby={
                  resetTokenError ? "reset-token-error" : undefined
                }
                aria-invalid={!!resetTokenError}
                disabled={isResetting}
                id="reset-token"
                onChange={(event) => {
                  setResetToken(event.target.value)
                  setResetTokenError(null)
                }}
                placeholder="Enter the token from your email"
                ref={tokenRef}
                value={resetToken}
              />
            </AuthField>

            <AuthField
              error={newPasswordError}
              helper="Use at least 8 characters."
              id="reset-password"
              label="New password"
            >
              <Input
                aria-describedby={
                  newPasswordError
                    ? "reset-password-error"
                    : "reset-password-help"
                }
                aria-invalid={!!newPasswordError}
                autoComplete="new-password"
                disabled={isResetting}
                id="reset-password"
                onChange={(event) => {
                  setNewPassword(event.target.value)
                  setNewPasswordError(null)
                }}
                placeholder="Enter a new password"
                ref={passwordRef}
                type="password"
                value={newPassword}
              />
            </AuthField>

            <AuthField
              error={confirmError}
              id="reset-password-confirm"
              label="Confirm password"
            >
              <Input
                aria-describedby={
                  confirmError ? "reset-password-confirm-error" : undefined
                }
                aria-invalid={!!confirmError}
                autoComplete="new-password"
                disabled={isResetting}
                id="reset-password-confirm"
                onChange={(event) => {
                  setNewPasswordConfirm(event.target.value)
                  setConfirmError(null)
                }}
                placeholder="Confirm your password"
                ref={confirmRef}
                type="password"
                value={newPasswordConfirm}
              />
            </AuthField>

            <Button className="h-11 w-full text-sm" disabled={isResetting}>
              {isResetting ? "Resetting password" : "Reset password"}
            </Button>
          </form>
        ) : null}

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-foreground underline">
            Back to log in
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-5">
      {requestError ? (
        <Notice title="Request failed" tone="destructive">
          {requestError}
        </Notice>
      ) : null}
      {requestSuccess ? <Notice tone="success">{requestSuccess}</Notice> : null}

      {!requestSuccess ? (
        <form className="grid gap-5" onSubmit={onRequestReset}>
          <AuthField
            error={requestEmailError}
            helper="Use the email address attached to your workspace."
            id="forgot-email"
            label="Email"
          >
            <Input
              aria-describedby={
                requestEmailError ? "forgot-email-error" : "forgot-email-help"
              }
              aria-invalid={!!requestEmailError}
              autoComplete="email"
              disabled={requestingToken}
              id="forgot-email"
              onChange={(event) => {
                setRequestEmail(event.target.value)
                setRequestEmailError(null)
              }}
              placeholder="you@example.com"
              ref={emailRef}
              type="email"
              value={requestEmail}
            />
          </AuthField>

          <Button className="h-11 w-full text-sm" disabled={requestingToken}>
            {requestingToken
              ? "Sending instructions"
              : "Send reset instructions"}
          </Button>
        </form>
      ) : null}

      {tokenDisplay ? (
        <Notice tone="info">
          <p className="font-medium text-foreground">Development token</p>
          <p className="mt-1 font-mono text-xs break-all">{tokenDisplay}</p>
          <p className="mt-2">
            Use this token in the reset form, or{" "}
            <Link
              href={`/forgot-password?token=${encodeURIComponent(tokenDisplay)}`}
              className="font-medium text-foreground underline"
            >
              open the reset step
            </Link>
            .
          </p>
        </Notice>
      ) : null}

      <p className="text-center text-sm text-muted-foreground">
        Remember your password?{" "}
        <Link href="/login" className="font-medium text-foreground underline">
          Log in
        </Link>
      </p>
    </div>
  )
}
