import { SavedOutputViews } from "@/components/cvs/saved-output-views"
import { DashboardHeader } from "@/components/ui/page-header"

export default function DashboardHistoryPage() {
  return (
    <div className="space-y-8">
      <DashboardHeader
        eyebrow="History"
        title="History"
        description="Find, preview, and manage saved outputs from your CV workflows."
      />
      <SavedOutputViews />
    </div>
  )
}
