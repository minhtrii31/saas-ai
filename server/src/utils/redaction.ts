const REDACTED = "[REDACTED]"

const sensitiveKeyPattern =
  /password|token|cookie|authorization|secret|parsedtext|cvtext|jdtext|jobdescription|descriptiontext|prompt|rawjson|response|coverletter|body/i

export const redactSensitiveData = (value: unknown): unknown => {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: REDACTED,
      stack: REDACTED,
    }
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveData(item))
  }

  if (!value || typeof value !== "object") {
    return value
  }

  return Object.entries(value as Record<string, unknown>).reduce<
    Record<string, unknown>
  >((redacted, [key, item]) => {
    redacted[key] = sensitiveKeyPattern.test(key)
      ? REDACTED
      : redactSensitiveData(item)

    return redacted
  }, {})
}

export const containsSensitiveLogMarker = (
  value: unknown,
  marker: string,
): boolean => {
  return JSON.stringify(value).includes(marker)
}
