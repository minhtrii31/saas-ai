import type { ErrorRequestHandler } from "express"
import { randomUUID } from "crypto"
import { ZodError } from "zod"

import { env } from "../config/env"
import { sendError } from "../shared/api-response"
import { AppError } from "../shared/errors"
import type { RequestWithRequestId } from "../types/express"
import { logger } from "../utils/logger"

type HttpError = Error & {
  status?: number
  statusCode?: number
  type?: string
}

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const request = req as RequestWithRequestId
  request.requestId = request.requestId ?? randomUUID()
  res.setHeader("x-request-id", request.requestId)

  if (error instanceof AppError) {
    sendError(
      request,
      res,
      {
        code: error.code,
        message: error.message,
        details: error.details,
      },
      error.statusCode,
    )
    return
  }

  if (error instanceof ZodError) {
    sendError(
      request,
      res,
      {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: error.issues,
      },
      400,
    )
    return
  }

  const httpError = error as HttpError

  if (httpError.status === 400 || httpError.statusCode === 400) {
    sendError(
      request,
      res,
      {
        code: "BAD_REQUEST",
        message: "Malformed request",
      },
      400,
    )
    return
  }

  logger.error("Unhandled API error", {
    requestId: request.requestId,
    error,
  })

  sendError(
    request,
    res,
    {
      code: "INTERNAL_SERVER_ERROR",
      message:
        env.NODE_ENV === "production"
          ? "Internal server error"
          : error instanceof Error
            ? error.message
            : "Internal server error",
    },
    500,
  )
}
