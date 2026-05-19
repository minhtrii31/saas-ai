import { cn } from "@/lib/utils"

type LoadingStateProps = {
  title?: string
  message?: string
  className?: string
}

export function LoadingState({
  title = "Loading",
  message = "Checking the latest state.",
  className,
}: LoadingStateProps) {
  return (
    <div
      aria-live="polite"
      className={cn("flex min-h-40 items-center justify-center", className)}
      role="status"
    >
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="size-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
        <div>
          <p className="font-medium text-foreground">{title}</p>
          <p>{message}</p>
        </div>
      </div>
    </div>
  )
}
