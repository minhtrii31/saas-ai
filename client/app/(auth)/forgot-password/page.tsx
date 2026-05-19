import { Suspense } from "react"

import { ForgotPasswordForm } from "@/components/forms/forgot-password-form"
import { AuthShell } from "@/components/layout/auth-shell"

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Reset password">
      <Suspense fallback={null}>
        <ForgotPasswordForm />
      </Suspense>
    </AuthShell>
  )
}
