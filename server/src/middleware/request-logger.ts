import type { NextFunction, Request, Response } from "express"

import type { RequestWithRequestId } from "../types/express"
import { logger } from "../utils/logger"

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const startedAt = process.hrtime.bigint()

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000
    const request = req as RequestWithRequestId

    logger.info("HTTP request completed", {
      requestId: request.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs),
      ip: req.ip,
    })
  })

  next()
}
