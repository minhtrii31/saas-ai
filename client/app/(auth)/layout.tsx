import { AuthRedirect } from "@/components/layout/auth-redirect"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AuthRedirect>{children}</AuthRedirect>
}
