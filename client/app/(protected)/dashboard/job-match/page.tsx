import { CvJobMatchWorkflow } from "@/components/cvs/dashboard-workflow-pages"
import { DashboardHeader } from "@/components/ui/page-header"

export default function DashboardJobMatchPage() {
  return (
    <div className="space-y-8">
      <DashboardHeader
        eyebrow="Job match"
        title="Job match"
        description="Select a parsed CV, paste a job description, and compare fit, gaps, and tailoring guidance."
      />
      <CvJobMatchWorkflow />
    </div>
  )
}
