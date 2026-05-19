"use client"

import { Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import * as React from "react"

import { AccountSummary } from "@/components/account/account-summary"
import { EmailVerificationDialog } from "@/components/account/email-verification-dialog"
import { ErrorState } from "@/components/feedback/error-state"
import { Notice } from "@/components/shared/notice"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ApiError } from "@/lib/api/types"
import { useAuth } from "@/lib/auth/auth-context"

export function ProfileForm() {
  const {
    completeEmailVerification,
    requestEmailVerification,
    updateProfile,
    user,
  } = useAuth()
  const [name, setName] = React.useState(user?.name ?? "")
  const [avatarUrl, setAvatarUrl] = React.useState(user?.avatarUrl ?? "")
  const [error, setError] = React.useState<string | null>(null)
  const [fieldError, setFieldError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const [isVerificationModalOpen, setIsVerificationModalOpen] =
    React.useState(false)
  const [verificationToken, setVerificationToken] = React.useState("")
  const [verificationError, setVerificationError] = React.useState<
    string | null
  >(null)
  const [verificationSuccess, setVerificationSuccess] = React.useState<
    string | null
  >(null)
  const [isVerifying, setIsVerifying] = React.useState(false)
  const [requestingToken, setRequestingToken] = React.useState(false)
  const [tokenDisplay, setTokenDisplay] = React.useState<string | null>(null)

  const accountLabel = name.trim() || user?.email || "Account"
  const accountInitials = getAccountInitials(accountLabel)
  const hasChanges =
    name !== (user?.name ?? "") || avatarUrl !== (user?.avatarUrl ?? "")

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setFieldError(null)
    setSuccess(null)

    const trimmedName = name.trim()
    const trimmedAvatarUrl = avatarUrl.trim()

    if (trimmedName.length > 120) {
      setFieldError("Display name must be 120 characters or fewer.")
      return
    }

    if (trimmedAvatarUrl && !isHttpUrl(trimmedAvatarUrl)) {
      setFieldError("Avatar URL must start with http:// or https://.")
      return
    }

    setIsSubmitting(true)

    try {
      await updateProfile({
        name: trimmedName || null,
        avatarUrl: trimmedAvatarUrl || null,
      })
      setSuccess("Profile updated.")
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : "Unable to update profile right now."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  async function onRequestEmailVerification() {
    setRequestingToken(true)
    setVerificationError(null)
    setVerificationSuccess(null)

    try {
      const result = await requestEmailVerification()

      if (result.verificationToken) {
        setTokenDisplay(result.verificationToken)
        setVerificationSuccess(
          "Verification token created. Token is displayed below for development. In production, you would receive it via email."
        )
      } else {
        setVerificationSuccess(
          "Verification email sent. Check your email for the verification link."
        )
      }
    } catch (caughtError) {
      setVerificationError(
        caughtError instanceof ApiError
          ? caughtError.message
          : "Unable to request verification email right now."
      )
    } finally {
      setRequestingToken(false)
    }
  }

  function resetVerificationState() {
    setVerificationToken("")
    setVerificationError(null)
    setVerificationSuccess(null)
    setTokenDisplay(null)
  }

  async function onCompleteEmailVerification(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()
    setVerificationError(null)
    setVerificationSuccess(null)

    if (!verificationToken.trim()) {
      setVerificationError("Please enter the verification token.")
      return
    }

    setIsVerifying(true)

    try {
      await completeEmailVerification(verificationToken.trim())
      setVerificationSuccess("Email verified successfully.")
      setVerificationToken("")
      setTokenDisplay(null)

      setTimeout(() => {
        setIsVerificationModalOpen(false)
        setVerificationSuccess(null)
      }, 1500)
    } catch (caughtError) {
      setVerificationError(
        caughtError instanceof ApiError
          ? caughtError.message
          : "Unable to verify email right now."
      )
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="lg:order-2">
        <AccountSummary
          accountInitials={accountInitials}
          accountLabel={accountLabel}
          avatarUrl={avatarUrl}
          user={user}
          onVerifyEmail={() => {
            setIsVerificationModalOpen(true)
            resetVerificationState()
          }}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile details</CardTitle>
          <CardDescription>
            These editable details are used to personalize your dashboard
            workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-5">
            {fieldError ? (
              <>
                <ErrorState
                  title="Check profile details"
                  message={fieldError}
                  className="p-4"
                />
                <p id="profile-field-error" className="sr-only">
                  {fieldError}
                </p>
              </>
            ) : null}
            {error ? (
              <ErrorState
                title="Profile update failed"
                message={error}
                className="p-4"
              />
            ) : null}
            {success ? (
              <Notice tone="success">
                <div className="flex items-center gap-2 font-medium">
                  <HugeiconsIcon icon={Tick02Icon} size={16} strokeWidth={2} />
                  {success}
                </div>
              </Notice>
            ) : null}

            <Field>
              <Label htmlFor="profile-name">Display name</Label>
              <Input
                id="profile-name"
                type="text"
                autoComplete="name"
                placeholder="Your name"
                maxLength={120}
                value={name}
                onChange={(event) => setName(event.target.value)}
                aria-invalid={fieldError?.includes("Display name") || undefined}
                aria-describedby={
                  fieldError?.includes("Display name")
                    ? "profile-field-error"
                    : undefined
                }
              />
              <p className="text-xs/relaxed text-muted-foreground">
                Optional. Use the name you want shown in account surfaces.
              </p>
            </Field>

            <Field>
              <Label htmlFor="profile-avatar-url">Avatar URL</Label>
              <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
                <Avatar size="lg" className="size-12">
                  {avatarUrl.trim() ? (
                    <AvatarImage
                      src={avatarUrl.trim()}
                      alt=""
                      referrerPolicy="no-referrer"
                    />
                  ) : null}
                  <AvatarFallback className="bg-muted text-sm font-semibold text-foreground">
                    {accountInitials}
                  </AvatarFallback>
                </Avatar>
                <Input
                  id="profile-avatar-url"
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  placeholder="https://example.com/avatar.jpg"
                  value={avatarUrl}
                  onChange={(event) => setAvatarUrl(event.target.value)}
                  aria-invalid={fieldError?.includes("Avatar URL") || undefined}
                  aria-describedby={
                    fieldError?.includes("Avatar URL")
                      ? "profile-field-error"
                      : undefined
                  }
                />
              </div>
              <p className="text-xs/relaxed text-muted-foreground">
                Optional. Must start with http:// or https://.
              </p>
            </Field>

            <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center">
              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting || !hasChanges}
                className="w-full sm:w-auto"
              >
                {isSubmitting ? "Saving profile..." : "Save profile"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={isSubmitting || !hasChanges}
                className="w-full sm:w-auto"
                onClick={() => {
                  setName(user?.name ?? "")
                  setAvatarUrl(user?.avatarUrl ?? "")
                  setError(null)
                  setFieldError(null)
                  setSuccess(null)
                }}
              >
                Reset
              </Button>
              {!hasChanges ? (
                <p className="text-sm text-muted-foreground">
                  No unsaved profile changes.
                </p>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <EmailVerificationDialog
        error={verificationError}
        isRequesting={requestingToken}
        isVerifying={isVerifying}
        onCompleteVerification={onCompleteEmailVerification}
        onOpenChange={(open) => {
          setIsVerificationModalOpen(open)
          if (!open) {
            resetVerificationState()
          }
        }}
        onRequestVerification={onRequestEmailVerification}
        open={isVerificationModalOpen}
        success={verificationSuccess}
        token={verificationToken}
        tokenDisplay={tokenDisplay}
        onTokenChange={setVerificationToken}
      />
    </div>
  )
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value)

    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

function getAccountInitials(label: string) {
  const parts = label.trim().split(/\s+/).filter(Boolean)

  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase()
  }

  return parts[0]?.charAt(0).toUpperCase() || "A"
}
