"use client"

import { Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { ErrorState } from "@/components/feedback/error-state"
import { Notice } from "@/components/shared/notice"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

type EmailVerificationDialogProps = {
  error: string | null
  isRequesting: boolean
  isVerifying: boolean
  onCompleteVerification: (event: React.FormEvent<HTMLFormElement>) => void
  onOpenChange: (open: boolean) => void
  onRequestVerification: () => void
  open: boolean
  success: string | null
  token: string
  tokenDisplay: string | null
  onTokenChange: (token: string) => void
}

export function EmailVerificationDialog({
  error,
  isRequesting,
  isVerifying,
  onCompleteVerification,
  onOpenChange,
  onRequestVerification,
  open,
  success,
  token,
  tokenDisplay,
  onTokenChange,
}: EmailVerificationDialogProps) {
  const verificationComplete = success === "Email verified successfully."
  const tokenErrorId = error ? "verification-dialog-error" : undefined

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/60 duration-100 data-closed:animate-out data-closed:fade-out-0 data-open:animate-in data-open:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-50 grid max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-lg border border-border bg-popover p-5 text-popover-foreground shadow-lg outline-none duration-100",
            "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95"
          )}
        >
          <div className="space-y-2">
            <DialogPrimitive.Title className="font-heading text-base font-medium text-foreground">
              Verify email
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="text-sm leading-6 text-muted-foreground">
              Send a verification email, then enter the token from that message.
            </DialogPrimitive.Description>
          </div>

          {error ? (
            <>
              <ErrorState
                title="Verification failed"
                message={error}
                className="p-3"
              />
              <p id="verification-dialog-error" className="sr-only">
                {error}
              </p>
            </>
          ) : null}
          {success ? (
            <Notice tone="success" className="p-3">
              <div className="flex items-center gap-2 font-medium">
                <HugeiconsIcon icon={Tick02Icon} size={16} strokeWidth={2} />
                {success}
              </div>
            </Notice>
          ) : null}

          {!verificationComplete ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={onRequestVerification}
                disabled={isRequesting || isVerifying}
              >
                {isRequesting ? "Sending..." : "Send verification email"}
              </Button>

              {tokenDisplay ? (
                <Notice tone="info" className="p-3 text-xs">
                  <p className="font-semibold text-foreground">
                    Development token
                  </p>
                  <p className="mt-1 break-all font-mono">{tokenDisplay}</p>
                </Notice>
              ) : null}

              <Separator />

              <form onSubmit={onCompleteVerification} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="verification-token">Verification token</Label>
                  <Input
                    id="verification-token"
                    placeholder="Enter the token from your email"
                    value={token}
                    onChange={(event) => onTokenChange(event.target.value)}
                    disabled={isVerifying}
                    aria-invalid={Boolean(error)}
                    aria-describedby={tokenErrorId}
                  />
                </div>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <DialogPrimitive.Close asChild>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isVerifying}
                    >
                      Cancel
                    </Button>
                  </DialogPrimitive.Close>
                  <Button
                    type="submit"
                    disabled={isVerifying || !token.trim()}
                  >
                    {isVerifying ? "Verifying..." : "Verify email"}
                  </Button>
                </div>
              </form>
            </>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
