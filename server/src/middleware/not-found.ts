import type { NextFunction, Request, Response } from "express"

import { AppError } from "../shared/errors"

const sanitizePathForNotFound = (path: string): string => {
  return path.replace(/[^A-Za-z0-9/_:.-]/g, "").slice(0, 200)
}

export const notFoundHandler = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  next(
    new AppError({
      code: "NOT_FOUND",
      message: `Route not found: ${req.method} ${sanitizePathForNotFound(
        req.path,
      )}`,
      statusCode: 404,
    }),
  )
}
