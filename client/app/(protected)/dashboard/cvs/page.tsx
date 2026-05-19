import { CvUploadPanel } from "@/components/cvs/cv-upload-panel"
import { DashboardHeader } from "@/components/ui/page-header"

export default function DashboardCvsPage() {
  return (
    <div className="space-y-8">
      <DashboardHeader
        eyebrow="CVs"
        title="CVs"
        description="Upload and parse CV files before analysis, job matching, or cover letter drafting."
      />
      <CvUploadPanel />
    </div>
  )
}
