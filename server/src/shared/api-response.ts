import type { Response } from "express"

import type { RequestWithRequestId } from "../types/express"

type ApiMeta = {
  requestId: string
}

export type ApiSuccessResponse<TData> = {
  data: TData
  meta: ApiMeta
}

export type ApiErrorResponse = {
  error: {
    code: string
    message: string
    details?: unknown
  }
  meta: ApiMeta
}

export const sendSuccess = <TData>(
  req: RequestWithRequestId,
  res: Response,
  data: TData,
  statusCode = 200,
): Response<ApiSuccessResponse<TData>> => {
  return res.status(statusCode).json({
    data,
    meta: {
      requestId: req.requestId,
    },
  })
}

export const sendError = (
  req: RequestWithRequestId,
  res: Response,
  error: ApiErrorResponse["error"],
  statusCode: number,
): Response<ApiErrorResponse> => {
  return res.status(statusCode).json({
    error,
    meta: {
      requestId: req.requestId,
    },
  })
}
