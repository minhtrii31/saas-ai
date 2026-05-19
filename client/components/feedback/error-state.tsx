import type { ReactNode } from "react"

import { Notice } from "@/components/shared/notice"
import { cn } from "@/lib/utils"

type ErrorStateProps = {
  title?: string
  message: string
  action?: ReactNode
  className?: string
}

export function ErrorState({
  title = "Something went wrong",
  message,
  action,
  className,
}: ErrorStateProps) {
  return (
    <Notice
      action={action}
      className={cn("p-5", className)}
      title={title}
      tone="destructive"
    >
      {message}
    </Notice>
  )
}
