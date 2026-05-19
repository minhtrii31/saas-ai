import { DashboardOverview } from "@/components/cvs/dashboard-overview"
import { DashboardHeader } from "@/components/ui/page-header"

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <DashboardHeader
        eyebrow="Dashboard"
        title="CV analysis and matching"
        description="Choose a protected workspace surface. Each workflow now has a stable route that can be refreshed or shared."
      />
      <DashboardOverview />
    </div>
  )
}
