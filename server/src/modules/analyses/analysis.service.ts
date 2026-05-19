import { isValidObjectId, Types } from "mongoose"
import { ZodError } from "zod"

import { env } from "../../config/env"
import {
  createPaginationResult,
  type PaginationResult,
} from "../../shared/pagination"
import {
  AiProviderError,
  type AiJsonProvider,
} from "../../services/ai/ai-provider.types"
import { geminiProvider } from "../../services/ai/gemini-provider"
import { AppError } from "../../shared/errors"
import { findCvByIdForUser } from "../cvs/cv.repository"
import { buildCvAnalysisPrompt } from "./cv-analysis.prompt"
import {
  countAnalysesForUser,
  countUserAnalysesSince,
  createCvAnalysis,
  deleteAnalysisByIdForUser,
  findAnalysisByIdForUser,
  listAnalysesForUser,
} from "./analysis.repository"
import {
  toPublicCvAnalysis,
  toPublicCvAnalysisSummary,
} from "./analysis.presenter"
import type {
  PublicCvAnalysis,
  PublicCvAnalysisSummary,
} from "./analysis.types"
import { validateAndNormalizeCvAnalysis } from "./analysis.validation"

const createNotFoundError = (code = "CV_ANALYSIS_NOT_FOUND"): AppError => {
  return new AppError({
    code,
    message: code === "CV_NOT_FOUND" ? "CV not found" : "Analysis not found",
    statusCode: 404,
  })
}

const getStartOfUtcDay = (date: Date): Date => {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  )
}

const mapProviderError = (error: AiProviderError): AppError => {
  return new AppError({
    code: error.code,
    message:
      error.code === "AI_PROVIDER_TIMEOUT"
        ? "The AI analysis timed out. Please retry."
        : "The AI analysis service is temporarily unavailable.",
    statusCode: error.statusCode,
  })
}

export const analyzeCvForUser = async ({
  cvId,
  userId,
  requestId,
  provider = geminiProvider,
}: {
  cvId: string
  userId: string
  requestId?: string
  provider?: AiJsonProvider
}): Promise<PublicCvAnalysis> => {
  if (!isValidObjectId(cvId)) {
    throw createNotFoundError("CV_NOT_FOUND")
  }

  const cv = await findCvByIdForUser(cvId, userId)

  if (!cv) {
    throw createNotFoundError("CV_NOT_FOUND")
  }

  const parsedText = cv.parsedText?.trim()

  if (cv.parserStatus !== "parsed" || !parsedText) {
    throw new AppError({
      code: "CV_NOT_PARSED",
      message: "The CV must be parsed before analysis",
      statusCode: 409,
    })
  }

  const analysesToday = await countUserAnalysesSince({
    userId,
    since: getStartOfUtcDay(new Date()),
  })

  if (analysesToday >= env.CV_ANALYSIS_DAILY_LIMIT) {
    throw new AppError({
      code: "CV_ANALYSIS_LIMIT_EXCEEDED",
      message: "Daily CV analysis limit reached",
      statusCode: 429,
      details: {
        limit: env.CV_ANALYSIS_DAILY_LIMIT,
      },
    })
  }

  const prompt = buildCvAnalysisPrompt({ cvText: parsedText })

  let providerResult

  try {
    providerResult = await provider.generateJson({
      prompt: prompt.prompt,
      ...(requestId ? { requestId } : {}),
    })
  } catch (error) {
    if (error instanceof AiProviderError) {
      throw mapProviderError(error)
    }

    throw new AppError({
      code: "CV_ANALYSIS_FAILED",
      message: "The CV analysis could not be completed",
      statusCode: 502,
    })
  }

  let structuredAnalysis

  try {
    structuredAnalysis = validateAndNormalizeCvAnalysis(providerResult.rawJson)
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AppError({
        code: "AI_RESPONSE_INVALID",
        message: "The AI analysis response was invalid. Please retry.",
        statusCode: 502,
      })
    }

    throw error
  }

  const now = new Date()
  const analysis = await createCvAnalysis({
    userId: new Types.ObjectId(userId),
    cvId: cv._id,
    analysisStatus: "completed",
    analyzedAt: now,
    structuredAnalysis,
    aiMetadata: {
      provider: providerResult.provider,
      modelName: providerResult.modelName,
      promptVersion: prompt.promptVersion,
      promptFamily: prompt.promptFamily,
      ...(requestId ? { requestId } : {}),
      ...(providerResult.usage ? { usage: providerResult.usage } : {}),
      durationMs: providerResult.durationMs,
      validationStatus: "valid",
    },
  })

  return toPublicCvAnalysis(analysis)
}

export const getUserAnalysis = async ({
  analysisId,
  userId,
}: {
  analysisId: string
  userId: string
}): Promise<PublicCvAnalysis> => {
  if (!isValidObjectId(analysisId)) {
    throw createNotFoundError()
  }

  const analysis = await findAnalysisByIdForUser({ analysisId, userId })

  if (!analysis) {
    throw createNotFoundError()
  }

  return toPublicCvAnalysis(analysis)
}

export const listUserAnalyses = async (params:
  | string
  | {
      userId: string
      cvId?: string
      pagination?: {
        page: number
        pageSize: number
        skip: number
        sortBy: "createdAt" | "updatedAt" | "analyzedAt"
        sortOrder: "asc" | "desc"
      }
    }): Promise<
  | PublicCvAnalysisSummary[]
  | {
      analyses: PublicCvAnalysisSummary[]
      pagination: PaginationResult
    }
> => {
  const includePagination = typeof params !== "string" && Boolean(params.pagination)
  const {
  userId,
  cvId,
  pagination = {
    page: 1,
    pageSize: 50,
    skip: 0,
    sortBy: "createdAt" as const,
    sortOrder: "desc" as const,
  },
} = typeof params === "string" ? { userId: params } : params

  if (cvId && !isValidObjectId(cvId)) {
    throw createNotFoundError("CV_NOT_FOUND")
  }

  const [analyses, totalItems] = await Promise.all([
    listAnalysesForUser({
      userId,
      ...(cvId ? { cvId } : {}),
      skip: pagination.skip,
      limit: pagination.pageSize,
      sortBy: pagination.sortBy,
      sortOrder: pagination.sortOrder,
    }),
    countAnalysesForUser({ userId, ...(cvId ? { cvId } : {}) }),
  ])

  const summaries = analyses.map(toPublicCvAnalysisSummary)

  if (!includePagination) {
    return summaries
  }

  return {
    analyses: summaries,
    pagination: createPaginationResult({
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalItems,
    }),
  }
}

export const deleteUserAnalysis = async ({
  analysisId,
  userId,
}: {
  analysisId: string
  userId: string
}): Promise<{ deleted: true }> => {
  if (!isValidObjectId(analysisId)) {
    throw createNotFoundError()
  }

  const analysis = await deleteAnalysisByIdForUser({ analysisId, userId })

  if (!analysis) {
    throw createNotFoundError()
  }

  return { deleted: true }
}
