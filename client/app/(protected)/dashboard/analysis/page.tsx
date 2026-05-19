import { CvAnalysisWorkflow } from "@/components/cvs/dashboard-workflow-pages"
import { DashboardHeader } from "@/components/ui/page-header"

export default function DashboardAnalysisPage() {
  return (
    <div className="space-y-8">
      <DashboardHeader
        eyebrow="Analysis"
        title="Analysis"
        description="Select a parsed CV and generate a structured report."
      />
      <CvAnalysisWorkflow />
    </div>
  )
}
