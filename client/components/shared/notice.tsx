import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type NoticeTone = "default" | "info" | "success" | "warning" | "destructive"

type NoticeProps = {
  title?: ReactNode
  children: ReactNode
  action?: ReactNode
  tone?: NoticeTone
  className?: string
}

const noticeToneClassName: Record<NoticeTone, string> = {
  default: "border-border bg-muted/40 text-foreground",
  info: "border-info/30 bg-info/5 text-foreground",
  success: "border-success/30 bg-success/5 text-foreground",
  warning: "border-warning/40 bg-warning/5 text-foreground",
  destructive: "border-destructive/40 bg-destructive/5 text-foreground",
}

export function Notice({
  action,
  children,
  className,
  title,
  tone = "default",
}: NoticeProps) {
  const liveRegion = tone === "destructive" ? "assertive" : "polite"

  return (
    <div
      aria-live={liveRegion}
      className={cn(
        "min-w-0 max-w-full rounded-lg border p-4 text-sm leading-6",
        noticeToneClassName[tone],
        className
      )}
      role={tone === "destructive" ? "alert" : "status"}
    >
      {title ? (
        <p className="break-words font-medium text-foreground">{title}</p>
      ) : null}
      <div className={cn(title && "mt-1", "break-words text-muted-foreground")}>
        {children}
      </div>
      {action ? <div className="mt-4 min-w-0 max-w-full">{action}</div> : null}
    </div>
  )
}
