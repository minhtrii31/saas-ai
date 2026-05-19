import { env } from "../config/env"
import { redactSensitiveData } from "./redaction"

type LogFields = Record<string, unknown>

const write = (
  level: "info" | "warn" | "error",
  message: string,
  fields?: LogFields,
): void => {
  if (env.NODE_ENV === "test" && process.env.ENABLE_TEST_LOGS !== "true") {
    return
  }

  const payload = fields ? redactSensitiveData(fields) : undefined

  if (level === "error") {
    console.error(message, payload)
    return
  }

  if (level === "warn") {
    console.warn(message, payload)
    return
  }

  console.info(message, payload)
}

export const logger = {
  info: (message: string, fields?: LogFields) => write("info", message, fields),
  warn: (message: string, fields?: LogFields) => write("warn", message, fields),
  error: (message: string, fields?: LogFields) =>
    write("error", message, fields),
}
