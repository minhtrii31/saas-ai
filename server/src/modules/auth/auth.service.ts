import bcrypt from "bcrypt"
import crypto from "crypto"
import { Types } from "mongoose"

import { env } from "../../config/env"
import {
  sendEmailVerificationEmail,
  sendPasswordResetEmail,
} from "../../services/email/email.service"
import { AppError } from "../../shared/errors"
import { logger } from "../../utils/logger"
import {
  clearUserRefreshToken,
  consumeLegacyRefreshToken,
  createUser,
  findUserByEmailForAuth,
  findUserByEmailVerificationTokenHash,
  findUserById,
  findUserByIdForAuth,
  findUserByPasswordResetTokenHash,
  findUserByRefreshTokenHash,
  updateUserById,
} from "../users/user.repository"
import { toPublicUser } from "../users/user.presenter"
import type { PublicUser } from "../users/user.types"
import type {
  ChangePasswordInput,
  CompleteEmailVerificationInput,
  CompletePasswordResetInput,
  LoginInput,
  RegisterInput,
  RequestPasswordResetInput,
  UpdateProfileInput,
} from "./auth.schema"
import {
  createOpaqueToken,
  createRefreshToken,
  hashOpaqueToken,
  hashRefreshToken,
  signAccessToken,
} from "./auth.tokens"
import {
  createRefreshSession,
  findRefreshSessionByTokenHash,
  revokeRefreshSession,
  revokeRefreshSessionFamily,
  revokeRefreshSessionsForUser,
} from "./refresh-session.repository"

const AUTH_ERROR = "Unable to complete authentication request"
const PASSWORD_SALT_ROUNDS = 12
const PASSWORD_RESET_EXPIRES_MS = 60 * 60 * 1000
const EMAIL_VERIFICATION_EXPIRES_MS = 24 * 60 * 60 * 1000

type AuthResult = {
  user: PublicUser
  accessToken: string
  refreshToken: string
}

type RefreshSessionContext = {
  userAgent?: string
  ipAddress?: string
}

type TokenIssueResult = {
  accepted: true
  token?: string
  expiresAt?: Date
}

type SessionIssueResult = {
  accessToken: string
  refreshToken: string
  sessionId: string
}

const createAuthError = (): AppError => {
  return new AppError({
    code: "AUTHENTICATION_FAILED",
    message: AUTH_ERROR,
    statusCode: 401,
  })
}

const shouldSendAccountEmail = (): boolean => {
  return (
    env.NODE_ENV === "production" ||
    process.env.FORCE_ACCOUNT_EMAIL_DELIVERY === "true"
  )
}

const issueSession = async (
  userId: string,
  role: PublicUser["role"],
  context: RefreshSessionContext = {},
  familyId: string = crypto.randomUUID(),
): Promise<SessionIssueResult> => {
  const refreshToken = createRefreshToken()
  const refreshTokenHash = hashRefreshToken(refreshToken.token)
  const sessionId = crypto.randomUUID()

  await createRefreshSession({
    sessionId,
    userId: new Types.ObjectId(userId),
    tokenHash: refreshTokenHash,
    familyId,
    expiresAt: refreshToken.expiresAt,
    ...(context.userAgent ? { userAgent: context.userAgent } : {}),
    ...(context.ipAddress ? { ipAddress: context.ipAddress } : {}),
  })

  await clearUserRefreshToken({ _id: userId })

  return {
    accessToken: signAccessToken({ sub: userId, role, sessionId }),
    refreshToken: refreshToken.token,
    sessionId,
  }
}

const issueSessionFromLegacyRefreshToken = async (
  refreshTokenHash: string,
  context: RefreshSessionContext,
): Promise<AuthResult | null> => {
  const user = await findUserByRefreshTokenHash(refreshTokenHash)

  if (
    !user ||
    !user.refreshTokenExpiresAt ||
    user.refreshTokenExpiresAt.getTime() <= Date.now()
  ) {
    return null
  }

  const consumedUser = await consumeLegacyRefreshToken({
    userId: user._id.toString(),
    refreshTokenHash,
    now: new Date(),
  })

  if (!consumedUser) {
    return null
  }

  const session = await issueSession(
    consumedUser._id.toString(),
    consumedUser.role,
    context,
  )

  return {
    user: toPublicUser(consumedUser),
    ...session,
  }
}

export const registerUser = async (
  input: RegisterInput,
  context: RefreshSessionContext = {},
): Promise<AuthResult> => {
  const existingUser = await findUserByEmailForAuth(input.email)

  if (existingUser) {
    throw createAuthError()
  }

  const passwordHash = await bcrypt.hash(input.password, PASSWORD_SALT_ROUNDS)

  try {
    const user = await createUser({
      email: input.email,
      passwordHash,
      role: "user",
      ...(input.name ? { name: input.name } : {}),
    })
    const session = await issueSession(user._id.toString(), user.role, context)

    return {
      user: toPublicUser(user),
      ...session,
    }
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      throw createAuthError()
    }

    throw error
  }
}

export const loginUser = async (
  input: LoginInput,
  context: RefreshSessionContext = {},
): Promise<AuthResult> => {
  const user = await findUserByEmailForAuth(input.email)

  if (!user) {
    throw createAuthError()
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash)

  if (!passwordMatches) {
    throw createAuthError()
  }

  const session = await issueSession(user._id.toString(), user.role, context)

  return {
    user: toPublicUser(user),
    ...session,
  }
}

export const rotateRefreshToken = async (
  refreshToken: string | undefined,
  context: RefreshSessionContext = {},
): Promise<AuthResult> => {
  if (!refreshToken) {
    throw createAuthError()
  }

  const refreshTokenHash = hashRefreshToken(refreshToken)
  const refreshSession = await findRefreshSessionByTokenHash(refreshTokenHash)

  if (!refreshSession) {
    const legacyResult = await issueSessionFromLegacyRefreshToken(
      refreshTokenHash,
      context,
    )

    if (legacyResult) {
      return legacyResult
    }

    throw createAuthError()
  }

  if (refreshSession.revokedAt) {
    await revokeRefreshSessionFamily({
      familyId: refreshSession.familyId,
      revokedAt: new Date(),
    })
    throw createAuthError()
  }

  if (refreshSession.expiresAt.getTime() <= Date.now()) {
    await revokeRefreshSession({
      sessionId: refreshSession.sessionId,
      revokedAt: new Date(),
    })
    throw createAuthError()
  }

  const user = await findUserById(refreshSession.userId.toString())

  if (!user) {
    await revokeRefreshSessionFamily({
      familyId: refreshSession.familyId,
      revokedAt: new Date(),
    })
    throw createAuthError()
  }

  const session = await issueSession(
    user._id.toString(),
    user.role,
    context,
    refreshSession.familyId,
  )
  const rotatedAt = new Date()
  const rotationSucceeded = await revokeRefreshSession({
    sessionId: refreshSession.sessionId,
    replacedBySessionId: session.sessionId,
    rotatedAt,
    revokedAt: rotatedAt,
  })

  if (!rotationSucceeded) {
    await revokeRefreshSessionFamily({
      familyId: refreshSession.familyId,
      revokedAt: new Date(),
    })
    throw createAuthError()
  }

  return {
    user: toPublicUser(user),
    ...session,
  }
}

export const logoutUser = async (
  userId: string | undefined,
  refreshToken: string | undefined,
  sessionId: string | undefined,
): Promise<void> => {
  if (refreshToken) {
    const refreshTokenHash = hashRefreshToken(refreshToken)
    const refreshSession = await findRefreshSessionByTokenHash(refreshTokenHash)

    if (refreshSession && !refreshSession.revokedAt) {
      await revokeRefreshSession({
        sessionId: refreshSession.sessionId,
        revokedAt: new Date(),
      })
      return
    }

    await clearUserRefreshToken({ refreshTokenHash })
  }

  if (sessionId) {
    await revokeRefreshSession({
      sessionId,
      revokedAt: new Date(),
    })
  }
}

export const getSessionUser = async (
  userId: string,
): Promise<PublicUser | null> => {
  const user = await findUserById(userId)

  return user ? toPublicUser(user) : null
}

export const updateUserProfile = async ({
  userId,
  input,
}: {
  userId: string
  input: UpdateProfileInput
}): Promise<PublicUser> => {
  const set: Record<string, string> = {}
  const unset: Record<string, ""> = {}

  if (input.name !== undefined) {
    if (input.name === null) {
      unset.name = ""
    } else {
      set.name = input.name
    }
  }

  if (input.avatarUrl !== undefined) {
    if (input.avatarUrl === null) {
      unset.avatarUrl = ""
    } else {
      set.avatarUrl = input.avatarUrl
    }
  }

  if (Object.keys(set).length === 0 && Object.keys(unset).length === 0) {
    const existingUser = await findUserById(userId)

    if (!existingUser) {
      throw createAuthError()
    }

    return toPublicUser(existingUser)
  }

  const user = await updateUserById(userId, {
    ...(Object.keys(set).length > 0 ? { $set: set } : {}),
    ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}),
  })

  if (!user) {
    throw createAuthError()
  }

  return toPublicUser(user)
}

export const changeUserPassword = async ({
  userId,
  input,
  context = {},
}: {
  userId: string
  input: ChangePasswordInput
  context?: RefreshSessionContext
}): Promise<AuthResult> => {
  const user = await findUserByIdForAuth(userId)

  if (!user) {
    throw createAuthError()
  }

  const passwordMatches = await bcrypt.compare(
    input.currentPassword,
    user.passwordHash,
  )

  if (!passwordMatches) {
    throw createAuthError()
  }

  const passwordHash = await bcrypt.hash(
    input.newPassword,
    PASSWORD_SALT_ROUNDS,
  )

  await updateUserById(user._id.toString(), {
    $set: { passwordHash },
    $unset: {
      passwordResetTokenHash: "",
      passwordResetTokenExpiresAt: "",
      refreshTokenHash: "",
      refreshTokenExpiresAt: "",
    },
  })
  await revokeRefreshSessionsForUser({
    userId: user._id.toString(),
    revokedAt: new Date(),
  })

  const session = await issueSession(user._id.toString(), user.role, context)
  const updatedUser = await findUserById(user._id.toString())

  if (!updatedUser) {
    throw createAuthError()
  }

  return {
    user: toPublicUser(updatedUser),
    ...session,
  }
}

export const requestPasswordReset = async (
  input: RequestPasswordResetInput,
): Promise<TokenIssueResult> => {
  const user = await findUserByEmailForAuth(input.email)

  if (!user) {
    return { accepted: true }
  }

  const resetToken = createOpaqueToken(PASSWORD_RESET_EXPIRES_MS)

  await updateUserById(user._id.toString(), {
    $set: {
      passwordResetTokenHash: hashOpaqueToken(resetToken.token),
      passwordResetTokenExpiresAt: resetToken.expiresAt,
    },
  })

  if (shouldSendAccountEmail()) {
    try {
      await sendPasswordResetEmail({
        to: user.email,
        token: resetToken.token,
        expiresAt: resetToken.expiresAt,
      })
    } catch (error) {
      logger.error("Password reset email delivery failed", {
        userId: user._id.toString(),
        error,
      })
    }
  }

  return {
    accepted: true,
    token: resetToken.token,
    expiresAt: resetToken.expiresAt,
  }
}

export const completePasswordReset = async (
  input: CompletePasswordResetInput,
  context: RefreshSessionContext = {},
): Promise<AuthResult> => {
  const user = await findUserByPasswordResetTokenHash(
    hashOpaqueToken(input.token),
  )

  if (
    !user ||
    !user.passwordResetTokenExpiresAt ||
    user.passwordResetTokenExpiresAt.getTime() <= Date.now()
  ) {
    throw new AppError({
      code: "PASSWORD_RESET_INVALID",
      message: "Password reset token is invalid or expired",
      statusCode: 400,
    })
  }

  const passwordHash = await bcrypt.hash(
    input.newPassword,
    PASSWORD_SALT_ROUNDS,
  )

  await updateUserById(user._id.toString(), {
    $set: { passwordHash },
    $unset: {
      passwordResetTokenHash: "",
      passwordResetTokenExpiresAt: "",
      refreshTokenHash: "",
      refreshTokenExpiresAt: "",
    },
  })
  await revokeRefreshSessionsForUser({
    userId: user._id.toString(),
    revokedAt: new Date(),
  })

  const session = await issueSession(user._id.toString(), user.role, context)
  const updatedUser = await findUserById(user._id.toString())

  if (!updatedUser) {
    throw createAuthError()
  }

  return {
    user: toPublicUser(updatedUser),
    ...session,
  }
}

export const requestEmailVerification = async (
  userId: string,
): Promise<TokenIssueResult> => {
  const user = await findUserById(userId)

  if (!user) {
    throw createAuthError()
  }

  if (user.emailVerifiedAt) {
    return { accepted: true }
  }

  const verificationToken = createOpaqueToken(EMAIL_VERIFICATION_EXPIRES_MS)

  await updateUserById(user._id.toString(), {
    $set: {
      emailVerificationTokenHash: hashOpaqueToken(verificationToken.token),
      emailVerificationTokenExpiresAt: verificationToken.expiresAt,
    },
  })

  if (shouldSendAccountEmail()) {
    try {
      await sendEmailVerificationEmail({
        to: user.email,
        token: verificationToken.token,
        expiresAt: verificationToken.expiresAt,
      })
    } catch (error) {
      logger.error("Email verification delivery failed", {
        userId: user._id.toString(),
        error,
      })

      throw new AppError({
        code: "EMAIL_DELIVERY_FAILED",
        message: "Unable to send verification email right now",
        statusCode: 503,
      })
    }
  }

  return {
    accepted: true,
    token: verificationToken.token,
    expiresAt: verificationToken.expiresAt,
  }
}

export const completeEmailVerification = async (
  input: CompleteEmailVerificationInput,
): Promise<PublicUser> => {
  const user = await findUserByEmailVerificationTokenHash(
    hashOpaqueToken(input.token),
  )

  if (
    !user ||
    !user.emailVerificationTokenExpiresAt ||
    user.emailVerificationTokenExpiresAt.getTime() <= Date.now()
  ) {
    throw new AppError({
      code: "EMAIL_VERIFICATION_INVALID",
      message: "Email verification token is invalid or expired",
      statusCode: 400,
    })
  }

  const updatedUser = await updateUserById(user._id.toString(), {
    $set: {
      emailVerifiedAt: new Date(),
    },
    $unset: {
      emailVerificationTokenHash: "",
      emailVerificationTokenExpiresAt: "",
    },
  })

  if (!updatedUser) {
    throw createAuthError()
  }

  return toPublicUser(updatedUser)
}
