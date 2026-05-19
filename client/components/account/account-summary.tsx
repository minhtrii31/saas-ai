"use client"

import type { ReactNode } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { PublicUser } from "@/types/auth"

type AccountSummaryProps = {
  accountInitials: string
  accountLabel: string
  avatarUrl: string
  onVerifyEmail: () => void
  user: PublicUser | null
}

export function AccountSummary({
  accountInitials,
  accountLabel,
  avatarUrl,
  onVerifyEmail,
  user,
}: AccountSummaryProps) {
  const verifiedAt = formatDateTime(user?.emailVerifiedAt)
  const createdAt = formatDateTime(user?.createdAt)
  const updatedAt = formatDateTime(user?.updatedAt)

  return (
    <Card className="h-fit lg:sticky lg:top-6">
      <CardHeader>
        <CardTitle>Account summary</CardTitle>
        <CardDescription>
          Account identity, verification state, and metadata.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-start gap-4">
          <Avatar size="lg" className="size-14">
            {avatarUrl.trim() ? (
              <AvatarImage
                src={avatarUrl.trim()}
                alt=""
                referrerPolicy="no-referrer"
              />
            ) : null}
            <AvatarFallback className="bg-muted text-base font-semibold text-foreground">
              {accountInitials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 pt-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {accountLabel}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {user?.email || "Email unavailable"}
            </p>
          </div>
        </div>

        <Separator />

        <dl className="grid gap-3 text-sm">
          <MetadataRow label="Role">
            <Badge variant="muted" className="capitalize">
              {user?.role || "user"}
            </Badge>
          </MetadataRow>
          <MetadataRow label="Email">
            <Badge variant={user?.emailVerified ? "default" : "muted"}>
              {user?.emailVerified ? "Verified" : "Unverified"}
            </Badge>
          </MetadataRow>
          {verifiedAt ? (
            <MetadataRow label="Verified">{verifiedAt}</MetadataRow>
          ) : null}
          <MetadataRow label="Created">{createdAt || "Unavailable"}</MetadataRow>
          <MetadataRow label="Updated">{updatedAt || "Unavailable"}</MetadataRow>
        </dl>

        {!user?.emailVerified ? (
          <div className="space-y-2 border-t border-border pt-4">
            <p className="text-sm font-medium text-foreground">
              Email verification
            </p>
            <p className="text-xs/relaxed text-muted-foreground">
              Send a verification email to confirm account ownership.
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={onVerifyEmail}
            >
              Send verification email
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function MetadataRow({
  children,
  label,
}: {
  children: ReactNode
  label: string
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right text-foreground">{children}</dd>
    </div>
  )
}

function formatDateTime(value?: string) {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}
