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
import { findJobDescriptionByIdForUser } from "../jobs/job.repository"
import { deleteGeneratedDocumentsForUserByComparisonId } from "../documents/document.repository"
import { buildJdMatchPrompt } from "./jd-match.prompt"
import {
  countComparisonsForUser,
  countUserComparisonsSince,
  createComparison,
  deleteComparisonByIdForUser,
  findComparisonByIdForUser,
  listComparisonsForUser,
} from "./comparison.repository"
import {
  toPublicComparison,
  toPublicComparisonSummary,
} from "./comparison.presenter"
import type {
  PublicComparison,
  PublicComparisonSummary,
} from "./comparison.types"
import {
  createComparisonSchema,
  validateAndNormalizeComparison,
} from "./comparison.validation"

const createNotFoundError = (code = "CV_JOB_COMPARISON_NOT_FOUND"): AppError => {
  return new AppError({
    code,
    message:
      code === "CV_NOT_FOUND"
        ? "CV not found"
        : code === "JOB_DESCRIPTION_NOT_FOUND"
          ? "Job description not found"
          : "Comparison not found",
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
        ? "The AI comparison timed out. Please retry."
        : "The AI comparison service is temporarily unavailable.",
    statusCode: error.statusCode,
  })
}

export const compareCvWithJobForUser = async ({
  input,
  userId,
  requestId,
  provider = geminiProvider,
}: {
  input: unknown
  userId: string
  requestId?: string
  provider?: AiJsonProvider
}): Promise<PublicComparison> => {
  const parsed = createComparisonSchema.parse(input)

  if (!isValidObjectId(parsed.cvId)) {
    throw createNotFoundError("CV_NOT_FOUND")
  }

  if (!isValidObjectId(parsed.jobDescriptionId)) {
    throw createNotFoundError("JOB_DESCRIPTION_NOT_FOUND")
  }

  const cv = await findCvByIdForUser(parsed.cvId, userId)

  if (!cv) {
    throw createNotFoundError("CV_NOT_FOUND")
  }

  const parsedText = cv.parsedText?.trim()

  if (cv.parserStatus !== "parsed" || !parsedText) {
    throw new AppError({
      code: "CV_NOT_PARSED",
      message: "The CV must be parsed before comparison",
      statusCode: 409,
    })
  }

  const job = await findJobDescriptionByIdForUser({
    jobDescriptionId: parsed.jobDescriptionId,
    userId,
  })

  if (!job) {
    throw createNotFoundError("JOB_DESCRIPTION_NOT_FOUND")
  }

  const jobDescriptionText = job.descriptionText.trim()

  if (jobDescriptionText.length > env.JOB_DESCRIPTION_MAX_CHARACTERS) {
    throw new AppError({
      code: "JOB_DESCRIPTION_TOO_LONG",
      message: "Job description text must be 10,000 characters or fewer",
      statusCode: 413,
    })
  }

  const comparisonsToday = await countUserComparisonsSince({
    userId,
    since: getStartOfUtcDay(new Date()),
  })

  if (comparisonsToday >= env.CV_JOB_COMPARISON_DAILY_LIMIT) {
    throw new AppError({
      code: "COMPARISON_LIMIT_EXCEEDED",
      message: "Daily comparison limit reached",
      statusCode: 429,
      details: {
        limit: env.CV_JOB_COMPARISON_DAILY_LIMIT,
      },
    })
  }

  const prompt = buildJdMatchPrompt({
    cvText: parsedText,
    jobDescription: jobDescriptionText,
  })

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
      code: "CV_JOB_COMPARISON_FAILED",
      message: "The CV and job comparison could not be completed",
      statusCode: 502,
    })
  }

  let structuredComparison

  try {
    structuredComparison = validateAndNormalizeComparison(
      providerResult.rawJson,
    )
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AppError({
        code: "AI_RESPONSE_INVALID",
        message: "The AI comparison response was invalid. Please retry.",
        statusCode: 502,
      })
    }

    throw error
  }

  const now = new Date()
  const comparison = await createComparison({
    userId: new Types.ObjectId(userId),
    cvId: cv._id,
    jobDescriptionId: job._id,
    comparisonStatus: "completed",
    comparedAt: now,
    structuredComparison,
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

  return toPublicComparison(comparison)
}

export const getUserComparison = async ({
  comparisonId,
  userId,
}: {
  comparisonId: string
  userId: string
}): Promise<PublicComparison> => {
  if (!isValidObjectId(comparisonId)) {
    throw createNotFoundError()
  }

  const comparison = await findComparisonByIdForUser({ comparisonId, userId })

  if (!comparison) {
    throw createNotFoundError()
  }

  return toPublicComparison(comparison)
}

export const listUserComparisons = async (params:
  | string
  | {
      userId: string
      cvId?: string
      jobDescriptionId?: string
      pagination?: {
        page: number
        pageSize: number
        skip: number
        sortBy: "createdAt" | "updatedAt" | "comparedAt"
        sortOrder: "asc" | "desc"
      }
    }): Promise<
  | PublicComparisonSummary[]
  | {
      comparisons: PublicComparisonSummary[]
      pagination: PaginationResult
    }
> => {
  const includePagination = typeof params !== "string" && Boolean(params.pagination)
  const {
  userId,
  cvId,
  jobDescriptionId,
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

  if (jobDescriptionId && !isValidObjectId(jobDescriptionId)) {
    throw createNotFoundError("JOB_DESCRIPTION_NOT_FOUND")
  }

  const [comparisons, totalItems] = await Promise.all([
    listComparisonsForUser({
      userId,
      ...(cvId ? { cvId } : {}),
      ...(jobDescriptionId ? { jobDescriptionId } : {}),
      skip: pagination.skip,
      limit: pagination.pageSize,
      sortBy: pagination.sortBy,
      sortOrder: pagination.sortOrder,
    }),
    countComparisonsForUser({
      userId,
      ...(cvId ? { cvId } : {}),
      ...(jobDescriptionId ? { jobDescriptionId } : {}),
    }),
  ])

  const summaries = comparisons.map(toPublicComparisonSummary)

  if (!includePagination) {
    return summaries
  }

  return {
    comparisons: summaries,
    pagination: createPaginationResult({
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalItems,
    }),
  }
}

export const deleteUserComparison = async ({
  comparisonId,
  userId,
}: {
  comparisonId: string
  userId: string
}): Promise<{ deleted: true }> => {
  if (!isValidObjectId(comparisonId)) {
    throw createNotFoundError()
  }

  const comparison = await findComparisonByIdForUser({ comparisonId, userId })

  if (!comparison) {
    throw createNotFoundError()
  }

  await deleteGeneratedDocumentsForUserByComparisonId({ comparisonId, userId })
  await deleteComparisonByIdForUser({ comparisonId, userId })

  return { deleted: true }
}
