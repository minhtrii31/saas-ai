import { CoverLetterWorkflow } from "@/components/cvs/dashboard-workflow-pages"
import { DashboardHeader } from "@/components/ui/page-header"

export default function DashboardCoverLettersPage() {
  return (
    <div className="space-y-8">
      <DashboardHeader
        eyebrow="Cover letter"
        title="Cover letter"
        description="Generate, edit, and save a draft from a selected job match."
      />
      <CoverLetterWorkflow />
    </div>
  )
}
