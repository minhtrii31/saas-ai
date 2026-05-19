import type { NextFunction, Request, Response } from "express"

import { env } from "../config/env"
import { AppError } from "../shared/errors"

const LOCAL_DEVELOPMENT_ORIGINS = new Set([
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:4000",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:4000",
])

export const allowedClientOrigins = (): Set<string> => {
  const origins = new Set<string>()

  if (env.CLIENT_ORIGIN) {
    origins.add(new URL(env.CLIENT_ORIGIN).origin)
  }

  if (env.NODE_ENV !== "production") {
    for (const origin of LOCAL_DEVELOPMENT_ORIGINS) {
      origins.add(origin)
    }
  }

  return origins
}

const getOriginFromReferer = (referer: string | undefined): string | null => {
  if (!referer) {
    return null
  }

  try {
    return new URL(referer).origin
  } catch {
    return null
  }
}

export const requireTrustedOrigin = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const allowedOrigins = allowedClientOrigins()
  const origin = req.header("origin")
  const refererOrigin = getOriginFromReferer(req.header("referer"))
  const requestOrigin = origin ?? refererOrigin

  if (requestOrigin && allowedOrigins.has(requestOrigin)) {
    next()
    return
  }

  if (!requestOrigin && env.NODE_ENV !== "production") {
    next()
    return
  }

  next(
    new AppError({
      code: "UNTRUSTED_ORIGIN",
      message: "Request origin is not allowed",
      statusCode: 403,
    }),
  )
}
