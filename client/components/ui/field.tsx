import * as React from "react"
import { cn } from "@/lib/utils"

type FieldProps = React.ComponentProps<"div"> & {
  className?: string
}

function Field({ className, ...props }: FieldProps) {
  return (
    <div
      data-slot="field"
      className={cn("space-y-2", className)}
      {...props}
    />
  )
}

export { Field }