import { Badge } from "@/components/ui/badge"

const previewRows = [
  ["CV", "Product Manager CV.pdf", "Parsed"],
  ["Analysis", "Strengths and gaps", "Complete"],
  ["Match", "Senior PM role", "82% fit"],
  ["Draft", "Cover letter", "Ready"],
]

export function HeroWorkflowPreview() {
  return (
    <aside
      className="rounded-lg border bg-card shadow-xs"
      aria-label="CV workflow preview"
    >
      <div className="border-b p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Workspace preview
            </p>
            <h2 className="mt-2 text-lg font-semibold">
              Application workflow
            </h2>
          </div>
          <Badge variant="outline">Private workspace</Badge>
        </div>
      </div>

      <div className="p-5">
        <ol className="grid gap-3">
          {previewRows.map(([label, value, status], index) => (
            <li
              key={label}
              className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 rounded-md border bg-background p-3"
            >
              <span className="flex size-8 items-center justify-center rounded-md bg-muted text-xs font-semibold">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="truncate text-sm font-medium">{value}</p>
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {status}
              </span>
            </li>
          ))}
        </ol>

        <div className="mt-5 rounded-md border bg-muted/40 p-4">
          <p className="text-sm font-medium">Generated output</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            A structured report explains fit, missing requirements, and the
            cover letter inputs before a draft is generated.
          </p>
        </div>
      </div>
    </aside>
  )
}
