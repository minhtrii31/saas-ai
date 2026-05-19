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
import { findComparisonByIdForUser } from "../comparisons/comparison.repository"
import { findCvByIdForUser } from "../cvs/cv.repository"
import { findJobDescriptionByIdForUser } from "../jobs/job.repository"
import { buildCoverLetterPrompt } from "./cover-letter.prompt"
import {
  countGeneratedDocumentsForUser,
  countUserGeneratedDocumentsSince,
  createGeneratedDocument,
  deleteGeneratedDocumentByIdForUser,
  findGeneratedDocumentByIdForUser,
  listGeneratedDocumentsForUser,
  updateGeneratedDocumentBodyForUser,
} from "./document.repository"
import {
  toPublicGeneratedDocument,
  toPublicGeneratedDocumentSummary,
} from "./document.presenter"
import type {
  GeneratedDocumentStatus,
  PublicGeneratedDocument,
  PublicGeneratedDocumentSummary,
} from "./document.types"
import {
  createCoverLetterSchema,
  updateGeneratedDocumentSchema,
  validateAndNormalizeCoverLetter,
} from "./document.validation"

const createNotFoundError = (code = "GENERATED_DOCUMENT_NOT_FOUND"): AppError => {
  return new AppError({
    code,
    message:
      code === "CV_NOT_FOUND"
        ? "CV not found"
        : code === "JOB_DESCRIPTION_NOT_FOUND"
          ? "Job description not found"
          : code === "CV_JOB_COMPARISON_NOT_FOUND"
            ? "Comparison not found"
            : "Generated document not found",
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
        ? "The cover letter generation timed out. Please retry."
        : "The cover letter generation service is temporarily unavailable.",
    statusCode: error.statusCode,
  })
}

export const generateCoverLetterForUser = async ({
  input,
  userId,
  requestId,
  provider = geminiProvider,
}: {
  input: unknown
  userId: string
  requestId?: string
  provider?: AiJsonProvider
}): Promise<PublicGeneratedDocument> => {
  const parsed = createCoverLetterSchema.parse(input)

  if (!isValidObjectId(parsed.cvId)) {
    throw createNotFoundError("CV_NOT_FOUND")
  }

  if (
    parsed.jobDescriptionId !== undefined &&
    !isValidObjectId(parsed.jobDescriptionId)
  ) {
    throw createNotFoundError("JOB_DESCRIPTION_NOT_FOUND")
  }

  if (parsed.comparisonId !== undefined && !isValidObjectId(parsed.comparisonId)) {
    throw createNotFoundError("CV_JOB_COMPARISON_NOT_FOUND")
  }

  const cv = await findCvByIdForUser(parsed.cvId, userId)

  if (!cv) {
    throw createNotFoundError("CV_NOT_FOUND")
  }

  const parsedText = cv.parsedText?.trim()

  if (cv.parserStatus !== "parsed" || !parsedText) {
    throw new AppError({
      code: "CV_NOT_PARSED",
      message: "The CV must be parsed before cover letter generation",
      statusCode: 409,
    })
  }

  const comparison = parsed.comparisonId
    ? await findComparisonByIdForUser({
        comparisonId: parsed.comparisonId,
        userId,
      })
    : null

  if (parsed.comparisonId && !comparison) {
    throw createNotFoundError("CV_JOB_COMPARISON_NOT_FOUND")
  }

  if (comparison && comparison.cvId.toString() !== cv._id.toString()) {
    throw new AppError({
      code: "COVER_LETTER_CONTEXT_INVALID",
      message: "Cover letter context does not match the selected CV",
      statusCode: 400,
    })
  }

  const jobDescriptionId =
    parsed.jobDescriptionId ?? comparison?.jobDescriptionId.toString()

  if (!jobDescriptionId || !isValidObjectId(jobDescriptionId)) {
    throw createNotFoundError("JOB_DESCRIPTION_NOT_FOUND")
  }

  const job = await findJobDescriptionByIdForUser({
    jobDescriptionId,
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

  const coverLettersToday = await countUserGeneratedDocumentsSince({
    userId,
    type: "cover_letter",
    since: getStartOfUtcDay(new Date()),
  })

  if (coverLettersToday >= env.COVER_LETTER_DAILY_LIMIT) {
    throw new AppError({
      code: "COVER_LETTER_LIMIT_EXCEEDED",
      message: "Daily cover letter generation limit reached",
      statusCode: 429,
      details: {
        limit: env.COVER_LETTER_DAILY_LIMIT,
      },
    })
  }

  const prompt = buildCoverLetterPrompt({
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
      code: "COVER_LETTER_GENERATION_FAILED",
      message: "The cover letter could not be generated",
      statusCode: 502,
    })
  }

  let normalizedDraft

  try {
    normalizedDraft = validateAndNormalizeCoverLetter(providerResult.rawJson)
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AppError({
        code: "AI_RESPONSE_INVALID",
        message: "The AI cover letter response was invalid. Please retry.",
        statusCode: 502,
      })
    }

    throw error
  }

  const now = new Date()
  const document = await createGeneratedDocument({
    userId: new Types.ObjectId(userId),
    type: "cover_letter",
    status: "draft",
    cvId: cv._id,
    jobDescriptionId: job._id,
    ...(comparison ? { comparisonId: comparison._id } : {}),
    title: normalizedDraft.title,
    body: normalizedDraft.body,
    notes: normalizedDraft.notes,
    generatedAt: now,
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

  return toPublicGeneratedDocument(document)
}

export const getUserGeneratedDocument = async ({
  documentId,
  userId,
}: {
  documentId: string
  userId: string
}): Promise<PublicGeneratedDocument> => {
  if (!isValidObjectId(documentId)) {
    throw createNotFoundError()
  }

  const document = await findGeneratedDocumentByIdForUser({
    documentId,
    userId,
  })

  if (!document) {
    throw createNotFoundError()
  }

  return toPublicGeneratedDocument(document)
}

export const listUserGeneratedDocuments = async (params: {
  userId: string
  type?: "cover_letter"
  status?: GeneratedDocumentStatus
  cvId?: string
  jobDescriptionId?: string
  comparisonId?: string
  pagination?: {
    page: number
    pageSize: number
    skip: number
    sortBy: "createdAt" | "updatedAt" | "generatedAt" | "title"
    sortOrder: "asc" | "desc"
  }
}): Promise<
  | PublicGeneratedDocumentSummary[]
  | {
      documents: PublicGeneratedDocumentSummary[]
      pagination: PaginationResult
    }
> => {
  const includePagination = Boolean(params.pagination)
  const {
  userId,
  type,
  status,
  cvId,
  jobDescriptionId,
  comparisonId,
  pagination = {
    page: 1,
    pageSize: 50,
    skip: 0,
    sortBy: "createdAt" as const,
    sortOrder: "desc" as const,
  },
} = params

  if (cvId && !isValidObjectId(cvId)) {
    throw createNotFoundError("CV_NOT_FOUND")
  }

  if (jobDescriptionId && !isValidObjectId(jobDescriptionId)) {
    throw createNotFoundError("JOB_DESCRIPTION_NOT_FOUND")
  }

  if (comparisonId && !isValidObjectId(comparisonId)) {
    throw createNotFoundError("CV_JOB_COMPARISON_NOT_FOUND")
  }

  const [documents, totalItems] = await Promise.all([
    listGeneratedDocumentsForUser({
      userId,
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
      ...(cvId ? { cvId } : {}),
      ...(jobDescriptionId ? { jobDescriptionId } : {}),
      ...(comparisonId ? { comparisonId } : {}),
      skip: pagination.skip,
      limit: pagination.pageSize,
      sortBy: pagination.sortBy,
      sortOrder: pagination.sortOrder,
    }),
    countGeneratedDocumentsForUser({
      userId,
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
      ...(cvId ? { cvId } : {}),
      ...(jobDescriptionId ? { jobDescriptionId } : {}),
      ...(comparisonId ? { comparisonId } : {}),
    }),
  ])

  const summaries = documents.map(toPublicGeneratedDocumentSummary)

  if (!includePagination) {
    return summaries
  }

  return {
    documents: summaries,
    pagination: createPaginationResult({
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalItems,
    }),
  }
}

export const updateUserGeneratedDocument = async ({
  documentId,
  userId,
  input,
}: {
  documentId: string
  userId: string
  input: unknown
}): Promise<PublicGeneratedDocument> => {
  if (!isValidObjectId(documentId)) {
    throw createNotFoundError()
  }

  const parsed = updateGeneratedDocumentSchema.parse(input)
  const document = await updateGeneratedDocumentBodyForUser({
    documentId,
    userId,
    ...(parsed.title ? { title: parsed.title } : {}),
    body: parsed.body,
  })

  if (!document) {
    throw createNotFoundError()
  }

  return toPublicGeneratedDocument(document)
}

export const deleteUserGeneratedDocument = async ({
  documentId,
  userId,
}: {
  documentId: string
  userId: string
}): Promise<{ deleted: true }> => {
  if (!isValidObjectId(documentId)) {
    throw createNotFoundError()
  }

  const document = await deleteGeneratedDocumentByIdForUser({
    documentId,
    userId,
  })

  if (!document) {
    throw createNotFoundError()
  }

  return { deleted: true }
}
