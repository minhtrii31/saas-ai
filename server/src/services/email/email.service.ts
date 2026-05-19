import { env } from "../../config/env"
import { ConsoleEmailProvider } from "./console-email-provider"
import type { EmailProvider } from "./email-provider"
import { ResendEmailProvider } from "./resend-email-provider"

let emailProviderOverride: EmailProvider | undefined

const getAppBaseUrl = (): string => {
  return (env.APP_BASE_URL ?? env.CLIENT_ORIGIN ?? "http://localhost:3000").replace(
    /\/+$/,
    "",
  )
}

const createProvider = (): EmailProvider => {
  if (env.EMAIL_PROVIDER === "resend") {
    return new ResendEmailProvider(env.RESEND_API_KEY)
  }

  return new ConsoleEmailProvider()
}

export const setEmailProviderForTesting = (
  provider: EmailProvider | undefined,
): void => {
  emailProviderOverride = provider
}

export const getEmailProvider = (): EmailProvider => {
  return emailProviderOverride ?? createProvider()
}

export const buildPasswordResetLink = (token: string): string => {
  const url = new URL("/forgot-password", getAppBaseUrl())
  url.searchParams.set("token", token)

  return url.toString()
}

export const buildEmailVerificationLink = (token: string): string => {
  const url = new URL("/dashboard", getAppBaseUrl())
  url.searchParams.set("verificationToken", token)

  return url.toString()
}

export const sendPasswordResetEmail = async ({
  to,
  token,
  expiresAt,
}: {
  to: string
  token: string
  expiresAt: Date
}): Promise<void> => {
  await getEmailProvider().send({
    to,
    from: env.EMAIL_FROM,
    subject: "Reset your password",
    text: [
      "Use this link to reset your password:",
      buildPasswordResetLink(token),
      "",
      `This link expires at ${expiresAt.toISOString()}.`,
      "If you did not request a password reset, you can ignore this email.",
    ].join("\n"),
  })
}

export const sendEmailVerificationEmail = async ({
  to,
  token,
  expiresAt,
}: {
  to: string
  token: string
  expiresAt: Date
}): Promise<void> => {
  await getEmailProvider().send({
    to,
    from: env.EMAIL_FROM,
    subject: "Verify your email address",
    text: [
      "Use this link to verify your email address:",
      buildEmailVerificationLink(token),
      "",
      `This link expires at ${expiresAt.toISOString()}.`,
      "If you did not request this verification email, you can ignore this message.",
    ].join("\n"),
  })
}
