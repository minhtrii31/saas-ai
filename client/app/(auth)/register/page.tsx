import { RegisterForm } from "@/components/forms/register-form"
import { AuthShell } from "@/components/layout/auth-shell"

export default function RegisterPage() {
  return (
    <AuthShell title="Let's explore the right opportunities together.">
      <RegisterForm />
    </AuthShell>
  )
}
