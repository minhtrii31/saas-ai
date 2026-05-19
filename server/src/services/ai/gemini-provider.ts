import { GoogleGenerativeAI } from "@google/generative-ai"
import type { GenerateContentRequest } from "@google/generative-ai"

import { env } from "../../config/env"
import {
  AiProviderError,
  type AiJsonProvider,
  type GenerateJsonInput,
  type GenerateJsonResult,
} from "./ai-provider.types"

const parseProviderJson = (text: string): unknown => {
  const trimmed = text.trim()

  if (!trimmed) {
    return null
  }

  try {
    return JSON.parse(trimmed)
  } catch {
    return trimmed
  }
}

const isProviderTimeout = (error: unknown): boolean => {
  return (
    error instanceof AiProviderError && error.code === "AI_PROVIDER_TIMEOUT"
  )
}

const withTimeout = async <T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<T> => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await operation(controller.signal)
  } catch (error) {
    if (controller.signal.aborted) {
      throw new AiProviderError({
        code: "AI_PROVIDER_TIMEOUT",
        message: "The AI provider request timed out",
        statusCode: 504,
      })
    }

    throw error
  } finally {
    clearTimeout(timeout)
  }
}

export const createGeminiProvider = (): AiJsonProvider => {
  return {
    async generateJson(input: GenerateJsonInput): Promise<GenerateJsonResult> {
      if (!env.GEMINI_API_KEY) {
        throw new AiProviderError({
          code: "AI_PROVIDER_UNAVAILABLE",
          message: "The AI provider is not configured",
          statusCode: 503,
        })
      }

      const startedAt = Date.now()
      const client = new GoogleGenerativeAI(env.GEMINI_API_KEY)
      const model = client.getGenerativeModel({
        model: env.GEMINI_MODEL_NAME,
      })

      const request: GenerateContentRequest = {
        contents: [
          {
            role: "user",
            parts: [{ text: input.prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }

      try {
        const result = await withTimeout(
          (signal) => model.generateContent(request, { signal }),
          env.AI_REQUEST_TIMEOUT_MS,
        )
        const text = result.response.text()
        const usage = result.response.usageMetadata

        return {
          provider: "gemini",
          modelName: env.GEMINI_MODEL_NAME,
          rawJson: parseProviderJson(text),
          ...(usage
            ? {
                usage: {
                  inputTokens: usage.promptTokenCount,
                  outputTokens: usage.candidatesTokenCount,
                  totalTokens: usage.totalTokenCount,
                },
              }
            : {}),
          durationMs: Date.now() - startedAt,
        }
      } catch (error) {
        if (isProviderTimeout(error)) {
          throw error
        }

        throw new AiProviderError({
          code: "AI_PROVIDER_UNAVAILABLE",
          message: "The AI provider request failed",
          statusCode: 502,
        })
      }
    },
  }
}

export const geminiProvider = createGeminiProvider()
