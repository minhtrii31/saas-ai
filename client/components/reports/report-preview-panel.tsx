import { Badge } from "@/components/ui/badge"
import {
  ReportSection,
  ResultPanel,
  StatusSummary,
} from "@/components/cvs/workflow-panel-primitives"

const matchSignals = [
  "Product operations",
  "Workflow automation",
  "Structured document review",
]

const improvementItems = [
  "Quantify delivery impact in the latest role.",
  "Move AI tooling experience closer to the summary.",
  "Mirror the job description's workflow language.",
]

export function ReportPreviewPanel() {
  return (
    <ResultPanel
      eyebrow="Report preview"
      title="Senior operations role"
      status="Fit score 82%"
      statusTone="info"
    >
      <div className="grid gap-5 md:grid-cols-[0.9fr_1.1fr]">
        <ReportSection title="Matched signals">
          <div className="mt-4 flex flex-wrap gap-2">
            {matchSignals.map((signal) => (
              <Badge key={signal} variant="muted">
                {signal}
              </Badge>
            ))}
          </div>
          <StatusSummary
            ariaLabel="Preview status"
            className="mt-6 sm:grid-cols-2"
            items={[
              {
                label: "Analysis",
                value: "Complete",
                tone: "success",
              },
              {
                label: "Cover letter",
                value: "Ready",
                tone: "info",
              },
            ]}
          />
        </ReportSection>

        <ReportSection title="Suggested improvements">
          <ul className="mt-4 grid gap-3">
            {improvementItems.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-6">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-foreground" />
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </ReportSection>
      </div>
    </ResultPanel>
  )
}
