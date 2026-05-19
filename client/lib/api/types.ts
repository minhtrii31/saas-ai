export type ApiMeta = {
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
  meta?: ApiMeta
}

export class ApiError extends Error {
  code: string
  status: number
  details?: unknown
  requestId?: string

  constructor({
    code,
    message,
    status,
    details,
    requestId,
  }: {
    code: string
    message: string
    status: number
    details?: unknown
    requestId?: string
  }) {
    super(message)
    this.name = "ApiError"
    this.code = code
    this.status = status
    this.details = details
    this.requestId = requestId
  }
}
