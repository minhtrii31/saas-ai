import { LoginForm } from "@/components/forms/login-form"
import { AuthShell } from "@/components/layout/auth-shell"

export default function LoginPage() {
  return (
    <AuthShell title="Continue to find suitable opportunities">
      <LoginForm />
    </AuthShell>
  )
}
