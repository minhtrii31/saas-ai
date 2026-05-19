import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type StatusBadgeTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "destructive"

type StatusBadgeProps = React.ComponentProps<typeof Badge> & {
  tone?: StatusBadgeTone
  dot?: boolean
}

const toneToVariant: Record<
  StatusBadgeTone,
  React.ComponentProps<typeof Badge>["variant"]
> = {
  neutral: "muted",
  info: "info",
  success: "success",
  warning: "warning",
  destructive: "destructive",
}

function StatusBadge({
  children,
  className,
  dot = true,
  tone = "neutral",
  variant,
  ...props
}: StatusBadgeProps) {
  return (
    <Badge
      data-slot="status-badge"
      variant={variant ?? toneToVariant[tone]}
      className={cn("capitalize", className)}
      {...props}
    >
      {dot ? (
        <span
          aria-hidden="true"
          className="size-1.5 rounded-full bg-current opacity-75"
        />
      ) : null}
      {children}
    </Badge>
  )
}

export { StatusBadge }
