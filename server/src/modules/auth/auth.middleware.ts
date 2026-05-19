import type { NextFunction, Request, Response } from "express"

import { AppError } from "../../shared/errors"
import type { AuthenticatedRequest } from "../../types/express"
import type { UserRole } from "../users/user.types"
import type { AccessTokenPayload } from "./auth.tokens"
import { verifyAccessToken } from "./auth.tokens"
import { findRefreshSessionBySessionId } from "./refresh-session.repository"

const getBearerToken = (authorization: string | undefined): string | null => {
  if (!authorization) {
    return null
  }

  const [scheme, token] = authorization.split(" ")

  if (scheme !== "Bearer" || !token) {
    return null
  }

  return token
}

export const getAccessTokenFromAuthorization = getBearerToken

export const validateAccessTokenSession = async (
  payload: AccessTokenPayload,
): Promise<void> => {
  if (!payload.sessionId) {
    return
  }

  const refreshSession = await findRefreshSessionBySessionId(payload.sessionId)

  if (
    !refreshSession ||
    refreshSession.revokedAt ||
    refreshSession.expiresAt.getTime() <= Date.now() ||
    refreshSession.userId.toString() !== payload.sub
  ) {
    throw new Error("Invalid access token session")
  }
}

export const requireAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  const token = getBearerToken(req.headers.authorization)

  if (!token) {
    next(
      new AppError({
        code: "UNAUTHORIZED",
        message: "Authentication required",
        statusCode: 401,
      }),
    )
    return
  }

  try {
    const payload = verifyAccessToken(token)
    await validateAccessTokenSession(payload)
    ;(req as AuthenticatedRequest).user = {
      id: payload.sub,
      role: payload.role,
    }
    next()
  } catch {
    next(
      new AppError({
        code: "UNAUTHORIZED",
        message: "Authentication required",
        statusCode: 401,
      }),
    )
  }
}

export const requireRole = (roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user

    if (!user || !roles.includes(user.role)) {
      next(
        new AppError({
          code: "FORBIDDEN",
          message: "Access denied",
          statusCode: 403,
        }),
      )
      return
    }

    next()
  }
}
