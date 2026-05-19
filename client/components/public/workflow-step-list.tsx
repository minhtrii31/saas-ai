import {
  ChartAnalysisIcon,
  FileUploadIcon,
  MailEdit01Icon,
  Target02Icon,
} from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"

export const publicWorkflowSteps = [
  {
    title: "CV upload",
    description: "Add a PDF or DOCX CV and keep parser progress visible.",
    icon: FileUploadIcon,
  },
  {
    title: "Analysis",
    description: "Turn the CV into strengths, gaps, and practical edits.",
    icon: ChartAnalysisIcon,
  },
  {
    title: "Job match",
    description: "Compare the CV against a pasted job description.",
    icon: Target02Icon,
  },
  {
    title: "Cover letter generation",
    description: "Create a tailored draft from the CV and job context.",
    icon: MailEdit01Icon,
  },
]

type WorkflowStepListProps = {
  compact?: boolean
}

export function WorkflowStepList({ compact = false }: WorkflowStepListProps) {
  return (
    <ol
      className={cn(
        "grid gap-3",
        compact ? "grid-cols-1" : "sm:grid-cols-2 lg:grid-cols-4"
      )}
    >
      {publicWorkflowSteps.map((step, index) => (
        <li
          key={step.title}
          className="flex min-h-32 gap-4 rounded-lg border bg-card p-9"
        >
          <div>
            <p className="font-mono text-xs font-medium text-muted-foreground">
              /{index + 1}
            </p>
            <h3 className="mt-1 font-serif text-2xl font-semibold tracking-wider">
              {step.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {step.description}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}
