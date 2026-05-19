import { randomUUID } from "crypto"
import type { NextFunction, Request, Response } from "express"

import type { RequestWithRequestId } from "../types/express"

const REQUEST_ID_HEADER = "x-request-id"
const SAFE_REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,64}$/

export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const incomingRequestId = req.header(REQUEST_ID_HEADER)
  const trimmedRequestId = incomingRequestId?.trim()
  const requestId =
    trimmedRequestId && SAFE_REQUEST_ID_PATTERN.test(trimmedRequestId)
      ? trimmedRequestId
      : randomUUID()

  ;(req as RequestWithRequestId).requestId = requestId
  res.setHeader(REQUEST_ID_HEADER, requestId)

  next()
}
