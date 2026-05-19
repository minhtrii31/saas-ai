import type { ReactNode } from "react"

import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type AuthFieldProps = {
  id: string
  label: string
  error?: string | null
  helper?: ReactNode
  children: ReactNode
  className?: string
}

export function AuthField({
  children,
  className,
  error,
  helper,
  id,
  label,
}: AuthFieldProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs leading-5 text-destructive" id={`${id}-error`}>
          {error}
        </p>
      ) : helper ? (
        <p className="text-xs leading-5 text-muted-foreground" id={`${id}-help`}>
          {helper}
        </p>
      ) : null}
    </div>
  )
}
