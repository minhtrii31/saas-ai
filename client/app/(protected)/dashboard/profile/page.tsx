import { ProfileForm } from "@/components/account/profile-form"
import { DashboardHeader } from "@/components/ui/page-header"

export default function DashboardProfilePage() {
  return (
    <div className="space-y-8">
      <DashboardHeader
        eyebrow="Account"
        title="Profile"
        description="Review account identity and keep your editable profile details current."
      />
      <ProfileForm />
    </div>
  )
}
