"use client"

import * as React from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { MetadataChip } from "@/components/ui/metadata-chip"
import { StatusBadge } from "@/components/ui/status-badge"
import { cn } from "@/lib/utils"

type WorkflowPanelProps = React.ComponentProps<"section"> & {
  title: string
  description: string
  actions?: React.ReactNode
}

export function WorkflowPanel({
  actions,
  children,
  className,
  description,
  title,
  ...props
}: WorkflowPanelProps) {
  return (
    <Card className={cn("mt-6 scroll-mt-32", className)}>
      <section {...props}>
        <CardHeader className="gap-4 sm:flex sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 max-w-full space-y-1.5">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {actions ? (
            <div className="flex w-full min-w-0 flex-col items-stretch gap-2 sm:w-auto sm:shrink-0 sm:flex-row sm:flex-wrap sm:items-center">
              {actions}
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="min-w-0 max-w-full">{children}</CardContent>
      </section>
    </Card>
  )
}

type InlineStatusProps = {
  title: string
  message?: string
  className?: string
}

export function InlineLoadingStatus({
  className,
  message,
  title,
}: InlineStatusProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-muted/20 p-4 text-sm",
        className
      )}
    >
      <span
        aria-hidden="true"
        className="size-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary"
      />
      <div className="min-w-0">
        <p className="font-medium">{title}</p>
        {message ? (
          <p className="mt-0.5 text-muted-foreground">{message}</p>
        ) : null}
      </div>
    </div>
  )
}

export function ResultPanel({
  actions,
  children,
  className,
  eyebrow,
  status,
  statusTone = "success",
  title,
}: {
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
  eyebrow: string
  status?: string
  statusTone?: React.ComponentProps<typeof StatusBadge>["tone"]
  title: string
}) {
  return (
    <section
      className={cn(
        "min-w-0 max-w-full rounded-lg border bg-card p-5 sm:p-6",
        className
      )}
    >
      <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 max-w-full">
          <p className="text-xs font-medium text-muted-foreground uppercase">
            {eyebrow}
          </p>
          <h2 className="mt-2 text-lg font-semibold">{title}</h2>
        </div>
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
          {status ? (
            <StatusBadge tone={statusTone}>{status}</StatusBadge>
          ) : null}
          {actions}
        </div>
      </div>
      <div className="mt-5 min-w-0 max-w-full space-y-5">{children}</div>
    </section>
  )
}

export function ReportSection({
  children,
  className,
  description,
  title,
}: {
  children: React.ReactNode
  className?: string
  description?: string
  title: string
}) {
  return (
    <section
      className={cn(
        "min-w-0 max-w-full rounded-lg border bg-background p-5",
        className
      )}
    >
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">{title}</h3>
        {description ? (
          <p className="text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      <div className="mt-4 min-w-0 max-w-full">{children}</div>
    </section>
  )
}

export function StatusSummary({
  ariaLabel,
  className,
  items,
}: {
  ariaLabel: string
  className?: string
  items: Array<{
    detail?: React.ReactNode
    label: string
    tone?: React.ComponentProps<typeof StatusBadge>["tone"]
    value: React.ReactNode
  }>
}) {
  return (
    <div
      className={cn("grid min-w-0 max-w-full gap-3 sm:grid-cols-3", className)}
      aria-label={ariaLabel}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="min-w-0 max-w-full rounded-lg border bg-background p-4"
        >
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between">
            <div className="min-w-0 max-w-full">
              <p className="text-sm font-medium">{item.label}</p>
              {item.detail ? (
                <p className="mt-1 max-w-full break-words text-sm leading-6 text-muted-foreground">
                  {item.detail}
                </p>
              ) : null}
            </div>
            <StatusBadge
              className="max-w-full"
              tone={item.tone ?? "neutral"}
            >
              {item.value}
            </StatusBadge>
          </div>
        </div>
      ))}
    </div>
  )
}

type ReportListProps = {
  title: string
  items: string[]
  emptyMessage?: string
  tone?: "neutral" | "success" | "warning" | "info"
}

export function ReportList({
  emptyMessage = "No items found.",
  items,
  title,
  tone = "neutral",
}: ReportListProps) {
  const markerClassName = {
    neutral: "bg-muted-foreground",
    success: "bg-success",
    warning: "bg-warning",
    info: "bg-info",
  }[tone]

  return (
    <div className="min-w-0 max-w-full rounded-lg border bg-background p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <StatusBadge tone={items.length > 0 ? "info" : "neutral"}>
          {items.length}
        </StatusBadge>
      </div>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          {items.map((item) => (
            <li
              key={item}
              className="flex min-w-0 max-w-full gap-3 rounded-md border bg-muted/20 px-3 py-2.5"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "mt-2 size-1.5 shrink-0 rounded-full",
                  markerClassName
                )}
              />
              <span className="min-w-0 break-words leading-6">{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{emptyMessage}</p>
      )}
    </div>
  )
}

type AiMetadata = {
  modelName: string
  promptVersion: string
  durationMs?: number
  usage?: {
    inputTokens?: number
    outputTokens?: number
    totalTokens?: number
  }
}

export function AiMetadataRow({
  confidence,
  metadata,
}: {
  confidence?: string
  metadata: AiMetadata
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {confidence ? (
        <MetadataChip label="Confidence" value={confidence} />
      ) : null}
      <MetadataChip label="Prompt" value={metadata.promptVersion} />
      <MetadataChip label="Model" value={metadata.modelName} />
      {typeof metadata.durationMs === "number" ? (
        <MetadataChip label="Duration" value={`${metadata.durationMs}ms`} />
      ) : null}
      {metadata.usage?.totalTokens ? (
        <MetadataChip label="Tokens" value={metadata.usage.totalTokens} />
      ) : null}
    </div>
  )
}

export function FieldGroup({
  children,
  className,
}: React.ComponentProps<"div">) {
  return <div className={cn("space-y-2", className)}>{children}</div>
}
