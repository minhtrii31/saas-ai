import crypto from "crypto"
import jwt from "jsonwebtoken"

import { env } from "../../config/env"
import type { UserRole } from "../users/user.types"

export type AccessTokenPayload = {
  sub: string
  role: UserRole
  sessionId?: string
}

export type RefreshTokenPayload = {
  token: string
  expiresAt: Date
}

export type OpaqueTokenPayload = {
  token: string
  expiresAt: Date
}

export const ACCESS_TOKEN_ALGORITHM: jwt.Algorithm = "HS256"

export const signAccessToken = (payload: AccessTokenPayload): string => {
  const secret: jwt.Secret = env.ACCESS_TOKEN_SECRET
  const options: jwt.SignOptions = {
    algorithm: ACCESS_TOKEN_ALGORITHM,
    expiresIn: env.ACCESS_TOKEN_EXPIRES_IN as NonNullable<
      jwt.SignOptions["expiresIn"]
    >,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    jwtid: crypto.randomUUID(),
  }

  return jwt.sign(payload, secret, options)
}

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  let payload: string | jwt.JwtPayload

  try {
    payload = jwt.verify(token, env.ACCESS_TOKEN_SECRET, {
      algorithms: [ACCESS_TOKEN_ALGORITHM],
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    })
  } catch (error) {
    const decodedPayload = jwt.decode(token)
    const isLegacyToken =
      decodedPayload &&
      typeof decodedPayload === "object" &&
      !("iss" in decodedPayload) &&
      !("aud" in decodedPayload)

    if (!isLegacyToken) {
      throw error
    }

    payload = jwt.verify(token, env.ACCESS_TOKEN_SECRET, {
      algorithms: [ACCESS_TOKEN_ALGORITHM],
    })
  }

  if (
    typeof payload !== "object" ||
    typeof payload.sub !== "string" ||
    (payload.role !== "user" && payload.role !== "admin") ||
    ("sessionId" in payload && typeof payload.sessionId !== "string")
  ) {
    throw new Error("Invalid access token payload")
  }

  return {
    sub: payload.sub,
    role: payload.role,
    ...(payload.sessionId ? { sessionId: payload.sessionId } : {}),
  }
}

export const createRefreshToken = (): RefreshTokenPayload => {
  const token = crypto.randomBytes(48).toString("base64url")
  const expiresAt = new Date(
    Date.now() + env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
  )

  return {
    token,
    expiresAt,
  }
}

export const hashRefreshToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex")
}

export const createOpaqueToken = (expiresInMs: number): OpaqueTokenPayload => {
  return {
    token: crypto.randomBytes(48).toString("base64url"),
    expiresAt: new Date(Date.now() + expiresInMs),
  }
}

export const hashOpaqueToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex")
}
