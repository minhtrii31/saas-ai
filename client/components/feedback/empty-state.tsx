import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type EmptyStateProps = {
  title: string
  message: string
  action?: ReactNode
  className?: string
}

export function EmptyState({
  title,
  message,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-border bg-card p-8 text-center",
        className
      )}
    >
      <h2 className="text-base font-medium">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {message}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
