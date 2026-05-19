export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly details?: unknown

  constructor({
    code,
    message,
    statusCode,
    details,
  }: {
    code: string
    message: string
    statusCode: number
    details?: unknown
  }) {
    super(message)

    this.name = "AppError"
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }
}
