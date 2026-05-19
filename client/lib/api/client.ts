import { ApiError, type ApiErrorResponse, type ApiSuccessResponse } from "./types"

const getApiBaseUrl = () => {
  const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "")

  if (configuredApiUrl) {
    return configuredApiUrl
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_API_URL is required in production builds.")
  }

  return "http://127.0.0.1:4000"
}

const API_BASE_URL = getApiBaseUrl()

type ApiRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  body?: unknown
  accessToken?: string | null
}

type ApiFormRequestOptions = {
  method?: "POST" | "PUT" | "PATCH"
  body: FormData
  accessToken?: string | null
}

const parseJson = async (response: Response): Promise<unknown> => {
  const text = await response.text()

  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    throw new ApiError({
      code: "INVALID_JSON_RESPONSE",
      message: "The server returned an unreadable response.",
      status: response.status,
    })
  }
}

const isApiErrorResponse = (value: unknown): value is ApiErrorResponse => {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as ApiErrorResponse).error?.message === "string"
  )
}

export const apiRequest = async <TData>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<TData> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.accessToken
        ? { Authorization: `Bearer ${options.accessToken}` }
        : {}),
    },
    ...(options.body === undefined
      ? {}
      : { body: JSON.stringify(options.body) }),
  })

  const payload = await parseJson(response)

  if (!response.ok) {
    if (isApiErrorResponse(payload)) {
      throw new ApiError({
        code: payload.error.code,
        message: payload.error.message,
        status: response.status,
        details: payload.error.details,
        requestId: payload.meta?.requestId,
      })
    }

    throw new ApiError({
      code: "REQUEST_FAILED",
      message: "The request could not be completed.",
      status: response.status,
    })
  }

  return (payload as ApiSuccessResponse<TData>).data
}

export const apiFormRequest = async <TData>(
  path: string,
  options: ApiFormRequestOptions,
): Promise<TData> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "POST",
    credentials: "include",
    headers: {
      ...(options.accessToken
        ? { Authorization: `Bearer ${options.accessToken}` }
        : {}),
    },
    body: options.body,
  })

  const payload = await parseJson(response)

  if (!response.ok) {
    if (isApiErrorResponse(payload)) {
      throw new ApiError({
        code: payload.error.code,
        message: payload.error.message,
        status: response.status,
        details: payload.error.details,
        requestId: payload.meta?.requestId,
      })
    }

    throw new ApiError({
      code: "REQUEST_FAILED",
      message: "The request could not be completed.",
      status: response.status,
    })
  }

  return (payload as ApiSuccessResponse<TData>).data
}
