import { Router } from "express"

import { env } from "../../config/env"
import { requireTrustedOrigin } from "../../middleware/origin-protection"
import { createRateLimiter } from "../../middleware/rate-limit"
import { sendSuccess } from "../../shared/api-response"
import { AppError } from "../../shared/errors"
import type {
  AuthenticatedRequest,
  RequestWithRequestId,
} from "../../types/express"
import { clearRefreshTokenCookie, setRefreshTokenCookie } from "./auth.cookies"
import {
  getAccessTokenFromAuthorization,
  requireAuth,
} from "./auth.middleware"
import {
  changePasswordSchema,
  completeEmailVerificationSchema,
  completePasswordResetSchema,
  loginSchema,
  registerSchema,
  requestPasswordResetSchema,
  updateProfileSchema,
} from "./auth.schema"
import {
  changeUserPassword,
  completeEmailVerification,
  completePasswordReset,
  getSessionUser,
  loginUser,
  logoutUser,
  registerUser,
  requestEmailVerification,
  requestPasswordReset,
  rotateRefreshToken,
  updateUserProfile,
} from "./auth.service"
import { verifyAccessToken } from "./auth.tokens"

export const authRouter = Router()

export const shouldIncludeIssuedTokenInResponse = ({
  nodeEnv,
  token,
}: {
  nodeEnv: typeof env.NODE_ENV
  token: string | undefined
}): boolean => {
  return nodeEnv !== "production" && Boolean(token)
}

const loginRateLimiter = createRateLimiter({
  name: "auth-login",
  windowMs: env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_LOGIN_RATE_LIMIT_MAX,
  code: "AUTH_RATE_LIMIT_EXCEEDED",
  message: "Too many login attempts. Please try again later.",
  keyGenerator: (req) => `ip:${req.ip ?? "unknown"}`,
})

const getBodyEmailRateLimitKey = (req: { body?: unknown }): string => {
  const body = req.body

  if (!body || typeof body !== "object" || !("email" in body)) {
    return "email:unknown"
  }

  const email = (body as { email?: unknown }).email

  if (typeof email !== "string") {
    return "email:unknown"
  }

  const normalizedEmail = email.trim().toLowerCase()

  return normalizedEmail ? `email:${normalizedEmail}` : "email:unknown"
}

const getRefreshSessionContext = (req: {
  headers: { "user-agent"?: string | string[] | undefined }
  ip?: string | undefined
}) => {
  const userAgent = req.headers["user-agent"]

  return {
    ...(typeof userAgent === "string" ? { userAgent } : {}),
    ...(req.ip ? { ipAddress: req.ip } : {}),
  }
}

const getOptionalAccessTokenPayload = async (authorization: string | undefined) => {
  const accessToken = getAccessTokenFromAuthorization(authorization)

  if (!accessToken) {
    return undefined
  }

  try {
    return verifyAccessToken(accessToken)
  } catch {
    return undefined
  }
}

const loginEmailRateLimiter = createRateLimiter({
  name: "auth-login-email",
  windowMs: env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_LOGIN_RATE_LIMIT_MAX,
  code: "AUTH_RATE_LIMIT_EXCEEDED",
  message: "Too many login attempts. Please try again later.",
  keyGenerator: getBodyEmailRateLimitKey,
})

const registerRateLimiter = createRateLimiter({
  name: "auth-register",
  windowMs: env.AUTH_REGISTER_RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_REGISTER_RATE_LIMIT_MAX,
  code: "AUTH_RATE_LIMIT_EXCEEDED",
  message: "Too many registration attempts. Please try again later.",
  keyGenerator: (req) => `ip:${req.ip ?? "unknown"}`,
})

const refreshRateLimiter = createRateLimiter({
  name: "auth-refresh",
  windowMs: env.AUTH_REFRESH_RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_REFRESH_RATE_LIMIT_MAX,
  code: "AUTH_RATE_LIMIT_EXCEEDED",
  message: "Too many session refresh attempts. Please try again later.",
  keyGenerator: (req) => `ip:${req.ip ?? "unknown"}`,
})

const accountRateLimiter = createRateLimiter({
  name: "auth-account",
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  code: "AUTH_RATE_LIMIT_EXCEEDED",
  message: "Too many authentication attempts. Please try again later.",
  keyGenerator: (req) => `ip:${req.ip ?? "unknown"}`,
})

const passwordResetEmailRateLimiter = createRateLimiter({
  name: "auth-password-reset-email",
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  code: "AUTH_RATE_LIMIT_EXCEEDED",
  message: "Too many password reset attempts. Please try again later.",
  keyGenerator: getBodyEmailRateLimitKey,
})

authRouter.post(
  "/api/auth/register",
  registerRateLimiter,
  async (req, res, next) => {
    try {
      const input = registerSchema.parse({ body: req.body }).body
      const result = await registerUser(input, getRefreshSessionContext(req))

      setRefreshTokenCookie(res, result.refreshToken)
      sendSuccess(
        req as RequestWithRequestId,
        res,
        {
          user: result.user,
          accessToken: result.accessToken,
        },
        201,
      )
    } catch (error) {
      next(error)
    }
  },
)

authRouter.post(
  "/api/auth/login",
  loginRateLimiter,
  loginEmailRateLimiter,
  async (req, res, next) => {
    try {
      const input = loginSchema.parse({ body: req.body }).body
      const result = await loginUser(input, getRefreshSessionContext(req))

      setRefreshTokenCookie(res, result.refreshToken)
      sendSuccess(req as RequestWithRequestId, res, {
        user: result.user,
        accessToken: result.accessToken,
      })
    } catch (error) {
      next(error)
    }
  },
)

authRouter.post(
  "/api/auth/refresh",
  requireTrustedOrigin,
  refreshRateLimiter,
  async (req, res, next) => {
    try {
      const result = await rotateRefreshToken(
        req.cookies?.[env.REFRESH_TOKEN_COOKIE_NAME],
        getRefreshSessionContext(req),
      )

      setRefreshTokenCookie(res, result.refreshToken)
      sendSuccess(req as RequestWithRequestId, res, {
        user: result.user,
        accessToken: result.accessToken,
      })
    } catch (error) {
      clearRefreshTokenCookie(res)
      next(error)
    }
  },
)

authRouter.post(
  "/api/auth/logout",
  requireTrustedOrigin,
  async (req, res, next) => {
    try {
      const accessTokenPayload = await getOptionalAccessTokenPayload(
        req.headers.authorization,
      )
      await logoutUser(
        accessTokenPayload?.sub,
        req.cookies?.[env.REFRESH_TOKEN_COOKIE_NAME],
        accessTokenPayload?.sessionId,
      )

      clearRefreshTokenCookie(res)
      sendSuccess(req as RequestWithRequestId, res, { loggedOut: true })
    } catch (error) {
      next(error)
    }
  },
)

authRouter.get("/api/auth/me", requireAuth, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest
    const user = await getSessionUser(authReq.user.id)

    if (!user) {
      clearRefreshTokenCookie(res)
      throw new AppError({
        code: "UNAUTHORIZED",
        message: "Authentication required",
        statusCode: 401,
      })
    }

    sendSuccess(req as RequestWithRequestId, res, { user })
  } catch (error) {
    next(error)
  }
})

authRouter.patch("/api/auth/me", requireAuth, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest
    const input = updateProfileSchema.parse({ body: req.body }).body
    const user = await updateUserProfile({
      userId: authReq.user.id,
      input,
    })

    sendSuccess(req as RequestWithRequestId, res, { user })
  } catch (error) {
    next(error)
  }
})

authRouter.post(
  "/api/auth/change-password",
  requireTrustedOrigin,
  requireAuth,
  accountRateLimiter,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest
      const input = changePasswordSchema.parse({ body: req.body }).body
      const result = await changeUserPassword({
        userId: authReq.user.id,
        input,
        context: getRefreshSessionContext(req),
      })

      setRefreshTokenCookie(res, result.refreshToken)
      sendSuccess(req as RequestWithRequestId, res, {
        user: result.user,
        accessToken: result.accessToken,
      })
    } catch (error) {
      next(error)
    }
  },
)

authRouter.post(
  "/api/auth/password-reset/request",
  accountRateLimiter,
  passwordResetEmailRateLimiter,
  async (req, res, next) => {
    try {
      const input = requestPasswordResetSchema.parse({ body: req.body }).body
      const result = await requestPasswordReset(input)
      const includeToken = shouldIncludeIssuedTokenInResponse({
        nodeEnv: env.NODE_ENV,
        token: result.token,
      })

      sendSuccess(req as RequestWithRequestId, res, {
        accepted: true,
        ...(includeToken
          ? {
              resetToken: result.token,
              resetTokenExpiresAt: result.expiresAt,
            }
          : {}),
      })
    } catch (error) {
      next(error)
    }
  },
)

authRouter.post(
  "/api/auth/password-reset/complete",
  requireTrustedOrigin,
  accountRateLimiter,
  async (req, res, next) => {
    try {
      const input = completePasswordResetSchema.parse({ body: req.body }).body
      const result = await completePasswordReset(
        input,
        getRefreshSessionContext(req),
      )

      setRefreshTokenCookie(res, result.refreshToken)
      sendSuccess(req as RequestWithRequestId, res, {
        user: result.user,
        accessToken: result.accessToken,
      })
    } catch (error) {
      clearRefreshTokenCookie(res)
      next(error)
    }
  },
)

authRouter.post(
  "/api/auth/email-verification/request",
  requireAuth,
  accountRateLimiter,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest
      const result = await requestEmailVerification(authReq.user.id)
      const includeToken = shouldIncludeIssuedTokenInResponse({
        nodeEnv: env.NODE_ENV,
        token: result.token,
      })

      sendSuccess(req as RequestWithRequestId, res, {
        accepted: true,
        ...(includeToken
          ? {
              verificationToken: result.token,
              verificationTokenExpiresAt: result.expiresAt,
            }
          : {}),
      })
    } catch (error) {
      next(error)
    }
  },
)

authRouter.post(
  "/api/auth/email-verification/complete",
  requireTrustedOrigin,
  accountRateLimiter,
  async (req, res, next) => {
    try {
      const input = completeEmailVerificationSchema.parse({
        body: req.body,
      }).body
      const user = await completeEmailVerification(input)

      sendSuccess(req as RequestWithRequestId, res, { user })
    } catch (error) {
      next(error)
    }
  },
)
