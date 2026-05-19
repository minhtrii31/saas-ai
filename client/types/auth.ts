export type UserRole = "user" | "admin"

export type PublicUser = {
  id: string
  email: string
  name?: string
  avatarUrl?: string
  role: UserRole
  emailVerified?: boolean
  emailVerifiedAt?: string
  createdAt: string
  updatedAt: string
}

export type AuthSession = {
  user: PublicUser
  accessToken: string
}

export type LoginInput = {
  email: string
  password: string
}

export type RegisterInput = {
  name?: string
  email: string
  password: string
}

export type UpdateProfileInput = {
  name?: string | null
  avatarUrl?: string | null
}

export type RequestEmailVerificationResponse = {
  accepted: boolean
  verificationToken?: string
  verificationTokenExpiresAt?: string
}

export type CompleteEmailVerificationInput = {
  token: string
}

export type RequestPasswordResetResponse = {
  accepted: boolean
  resetToken?: string
  resetTokenExpiresAt?: string
}

export type CompletePasswordResetInput = {
  token: string
  newPassword: string
}
