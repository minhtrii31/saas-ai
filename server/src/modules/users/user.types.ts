import type { Types } from "mongoose"

export const USER_ROLES = ["user", "admin"] as const

export type UserRole = (typeof USER_ROLES)[number]

export type PublicUser = {
  id: string
  email: string
  name?: string
  avatarUrl?: string
  role: UserRole
  emailVerified: boolean
  emailVerifiedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export type UserDocumentShape = {
  _id: Types.ObjectId
  email: string
  passwordHash: string
  role: UserRole
  name?: string
  avatarUrl?: string
  refreshTokenHash?: string
  refreshTokenExpiresAt?: Date
  passwordResetTokenHash?: string
  passwordResetTokenExpiresAt?: Date
  emailVerificationTokenHash?: string
  emailVerificationTokenExpiresAt?: Date
  emailVerifiedAt?: Date
  createdAt: Date
  updatedAt: Date
}
