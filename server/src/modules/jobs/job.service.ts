import { isValidObjectId, Types } from "mongoose"
import { ZodError } from "zod"

import { AppError } from "../../shared/errors"
import {
  createPaginationResult,
  type PaginationResult,
} from "../../shared/pagination"
import {
  countJobDescriptionsForUser,
  createJobDescription,
  deleteJobDescriptionByIdForUser,
  findJobDescriptionByIdForUser,
  listJobDescriptionsForUser,
  updateJobDescriptionByIdForUser,
} from "./job.repository"
import {
  toPublicJobDescription,
  toPublicJobDescriptionSummary,
} from "./job.presenter"
import { deleteComparisonsForUserByJobDescriptionId } from "../comparisons/comparison.repository"
import { deleteGeneratedDocumentsForUserByJobDescriptionId } from "../documents/document.repository"
import type {
  PublicJobDescription,
  PublicJobDescriptionSummary,
} from "./job.types"
import {
  createJobDescriptionSchema,
  type CreateJobDescriptionInput,
  jobSearchSchema,
  updateJobDescriptionSchema,
  type UpdateJobDescriptionInput,
} from "./job.validation"

const createNotFoundError = (): AppError => {
  return new AppError({
    code: "JOB_DESCRIPTION_NOT_FOUND",
    message: "Job description not found",
    statusCode: 404,
  })
}

const mapCreateJobValidationError = (error: ZodError): AppError => {
  const tooLong = error.issues.some(
    (issue) =>
      issue.path.join(".") === "descriptionText" && issue.code === "too_big",
  )

  if (tooLong) {
    return new AppError({
      code: "JOB_DESCRIPTION_TOO_LONG",
      message: "Job description text must be 10,000 characters or fewer",
      statusCode: 413,
    })
  }

  return new AppError({
    code: "VALIDATION_ERROR",
    message: "Request validation failed",
    statusCode: 400,
    details: error.issues,
  })
}

export const createJobDescriptionForUser = async ({
  input,
  userId,
}: {
  input: unknown
  userId: string
}): Promise<PublicJobDescription> => {
  let parsed: CreateJobDescriptionInput

  try {
    parsed = createJobDescriptionSchema.parse(input)
  } catch (error) {
    if (error instanceof ZodError) {
      throw mapCreateJobValidationError(error)
    }

    throw error
  }

  const job = await createJobDescription({
    userId: new Types.ObjectId(userId),
    title: parsed.title,
    ...(parsed.company ? { company: parsed.company } : {}),
    descriptionText: parsed.descriptionText,
    inputType: "pasted",
    ...(parsed.sourceUrl ? { sourceUrl: parsed.sourceUrl } : {}),
  })

  return toPublicJobDescription(job)
}

export const getUserJobDescription = async ({
  jobDescriptionId,
  userId,
}: {
  jobDescriptionId: string
  userId: string
}): Promise<PublicJobDescription> => {
  if (!isValidObjectId(jobDescriptionId)) {
    throw createNotFoundError()
  }

  const job = await findJobDescriptionByIdForUser({ jobDescriptionId, userId })

  if (!job) {
    throw createNotFoundError()
  }

  return toPublicJobDescription(job)
}

export const listUserJobDescriptions = async (params:
  | string
  | {
      userId: string
      search?: string
      pagination?: {
        page: number
        pageSize: number
        skip: number
        sortBy: "createdAt" | "updatedAt" | "title" | "company"
        sortOrder: "asc" | "desc"
      }
    }): Promise<
  | PublicJobDescriptionSummary[]
  | {
      jobs: PublicJobDescriptionSummary[]
      pagination: PaginationResult
    }
> => {
  const includePagination = typeof params !== "string" && Boolean(params.pagination)
  const {
  userId,
  search,
  pagination = {
    page: 1,
    pageSize: 50,
    skip: 0,
    sortBy: "createdAt" as const,
    sortOrder: "desc" as const,
  },
} = typeof params === "string" ? { userId: params } : params
  const parsedSearch = jobSearchSchema.parse(search)

  const [jobs, totalItems] = await Promise.all([
    listJobDescriptionsForUser({
      userId,
      ...(parsedSearch ? { search: parsedSearch } : {}),
      skip: pagination.skip,
      limit: pagination.pageSize,
      sortBy: pagination.sortBy,
      sortOrder: pagination.sortOrder,
    }),
    countJobDescriptionsForUser({
      userId,
      ...(parsedSearch ? { search: parsedSearch } : {}),
    }),
  ])

  const summaries = jobs.map(toPublicJobDescriptionSummary)

  if (!includePagination) {
    return summaries
  }

  return {
    jobs: summaries,
    pagination: createPaginationResult({
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalItems,
    }),
  }
}

export const updateUserJobDescription = async ({
  jobDescriptionId,
  userId,
  input,
}: {
  jobDescriptionId: string
  userId: string
  input: unknown
}): Promise<PublicJobDescription> => {
  if (!isValidObjectId(jobDescriptionId)) {
    throw createNotFoundError()
  }

  let parsed: UpdateJobDescriptionInput

  try {
    parsed = updateJobDescriptionSchema.parse(input)
  } catch (error) {
    if (error instanceof ZodError) {
      throw mapCreateJobValidationError(error)
    }

    throw error
  }

  const job = await updateJobDescriptionByIdForUser({
    jobDescriptionId,
    userId,
    update: {
      ...(parsed.title ? { title: parsed.title } : {}),
      ...(parsed.company !== undefined ? { company: parsed.company } : {}),
      ...(parsed.descriptionText
        ? { descriptionText: parsed.descriptionText }
        : {}),
      ...(parsed.sourceUrl !== undefined ? { sourceUrl: parsed.sourceUrl } : {}),
    },
  })

  if (!job) {
    throw createNotFoundError()
  }

  return toPublicJobDescription(job)
}

export const deleteUserJobDescription = async ({
  jobDescriptionId,
  userId,
}: {
  jobDescriptionId: string
  userId: string
}): Promise<{ deleted: true }> => {
  if (!isValidObjectId(jobDescriptionId)) {
    throw createNotFoundError()
  }

  const job = await findJobDescriptionByIdForUser({ jobDescriptionId, userId })

  if (!job) {
    throw createNotFoundError()
  }

  await deleteGeneratedDocumentsForUserByJobDescriptionId({
    jobDescriptionId,
    userId,
  })
  await deleteComparisonsForUserByJobDescriptionId({
    jobDescriptionId,
    userId,
  })
  await deleteJobDescriptionByIdForUser({ jobDescriptionId, userId })

  return { deleted: true }
}
