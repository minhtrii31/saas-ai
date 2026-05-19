import * as React from "react"

import { cn } from "@/lib/utils"

type MetadataChipProps = React.ComponentProps<"span"> & {
  label: React.ReactNode
  value: React.ReactNode
}

function MetadataChip({
  className,
  label,
  value,
  ...props
}: MetadataChipProps) {
  return (
    <span
      data-slot="metadata-chip"
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground shadow-xs",
        className
      )}
      {...props}
    >
      <span className="shrink-0 font-medium text-foreground">{label}</span>
      <span className="min-w-0 truncate">{value}</span>
    </span>
  )
}

export { MetadataChip }
