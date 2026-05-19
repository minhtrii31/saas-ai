import type { CookieOptions, Response } from "express"

import { env } from "../../config/env"

const getRefreshCookieOptions = (): CookieOptions => {
  const isProduction = env.NODE_ENV === "production"

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/api/auth",
    maxAge: env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
  }
}

export const setRefreshTokenCookie = (
  res: Response,
  refreshToken: string,
): void => {
  res.cookie(env.REFRESH_TOKEN_COOKIE_NAME, refreshToken, getRefreshCookieOptions())
}

export const clearRefreshTokenCookie = (res: Response): void => {
  res.clearCookie(env.REFRESH_TOKEN_COOKIE_NAME, {
    ...getRefreshCookieOptions(),
    maxAge: undefined,
  })
}
