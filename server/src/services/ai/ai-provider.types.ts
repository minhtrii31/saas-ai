export type AiProviderName = "gemini"

export type AiUsageMetadata = {
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
}

export type GenerateJsonInput = {
  prompt: string
  requestId?: string
}

export type GenerateJsonResult = {
  provider: AiProviderName
  modelName: string
  rawJson: unknown
  usage?: AiUsageMetadata
  durationMs: number
}

export interface AiJsonProvider {
  generateJson(input: GenerateJsonInput): Promise<GenerateJsonResult>
}

export class AiProviderError extends Error {
  public readonly code: "AI_PROVIDER_TIMEOUT" | "AI_PROVIDER_UNAVAILABLE"
  public readonly statusCode: number

  constructor({
    code,
    message,
    statusCode,
  }: {
    code: "AI_PROVIDER_TIMEOUT" | "AI_PROVIDER_UNAVAILABLE"
    message: string
    statusCode: number
  }) {
    super(message)
    this.name = "AiProviderError"
    this.code = code
    this.statusCode = statusCode
  }
}
