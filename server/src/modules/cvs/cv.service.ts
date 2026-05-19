import { isValidObjectId, Types } from "mongoose"

import { env } from "../../config/env"
import { parseCvDocument } from "../../services/document-parser/document-parser"
import {
  deleteCloudinaryRawAsset,
  uploadCvFileToCloudinary,
} from "../../services/storage/cloudinary-storage"
import { AppError } from "../../shared/errors"
import {
  createPaginationResult,
  type PaginationResult,
} from "../../shared/pagination"
import { logger } from "../../utils/logger"
import { deleteAnalysesForUserByCvId } from "../analyses/analysis.repository"
import { deleteComparisonsForUserByCvId } from "../comparisons/comparison.repository"
import { deleteGeneratedDocumentsForUserByCvId } from "../documents/document.repository"
import {
  countCvsForUser,
  createCv,
  deleteCvByIdForUser,
  findCvByIdForUser,
  listCvsForUser,
  markCvStorageDeletionFailed,
  updateCvById,
} from "./cv.repository"
import { validateCvUploadFile } from "./cv.validation"
import { toPublicCv, toPublicCvWithParsedText } from "./cv.presenter"
import type {
  CvParserStatus,
  PublicCv,
  PublicCvWithParsedText,
} from "./cv.types"

const getTitleFromFileName = (fileName: string): string => {
  return fileName.replace(/\.[^.]+$/, "").trim() || "Uploaded CV"
}

const createNotFoundError = (): AppError => {
  return new AppError({
    code: "CV_NOT_FOUND",
    message: "CV not found",
    statusCode: 404,
  })
}

const cleanupUploadedCvAsset = async ({
  publicId,
  reason,
}: {
  publicId: string
  reason: string
}): Promise<void> => {
  try {
    await deleteCloudinaryRawAsset({ publicId })
  } catch (error) {
    logger.warn("Failed to clean up CV upload after workflow failure", {
      publicId,
      reason,
      errorCode: error instanceof AppError ? error.code : "UNKNOWN_ERROR",
    })
  }
}

export const uploadCvForUser = async ({
  userId,
  file,
}: {
  userId: string
  file: Express.Multer.File | undefined
}): Promise<PublicCv> => {
  validateCvUploadFile(file)

  if (!file) {
    throw new AppError({
      code: "CV_FILE_REQUIRED",
      message: "A PDF or DOCX CV file is required",
      statusCode: 400,
    })
  }

  const parsed = await (async () => {
    try {
      return await parseCvDocument({
        buffer: file.buffer,
        mimeType: file.mimetype,
      })
    } catch (error) {
      if (
        error instanceof AppError &&
        ["CV_PARSED_TEXT_TOO_LARGE", "CV_PARSING_TIMEOUT"].includes(error.code)
      ) {
        throw error
      }

      throw new AppError({
        code: "CV_PARSING_FAILED",
        message: "The CV could not be parsed",
        statusCode: 422,
      })
    }
  })()

  if (
    parsed.metadata.pageCount !== undefined &&
    parsed.metadata.pageCount > env.CV_MAX_PAGE_COUNT
  ) {
    throw new AppError({
      code: "CV_PAGE_LIMIT_EXCEEDED",
      message: `CV files must be ${env.CV_MAX_PAGE_COUNT} pages or fewer`,
      statusCode: 400,
      details: {
        detectedPageCount: parsed.metadata.pageCount,
        maxPageCount: env.CV_MAX_PAGE_COUNT,
      },
    })
  }

  const storedFile = await uploadCvFileToCloudinary({
    buffer: file.buffer,
    originalFileName: file.originalname,
  })

  try {
    const cv = await createCv({
      userId: new Types.ObjectId(userId),
      title: getTitleFromFileName(file.originalname),
      originalFileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      storageProvider: storedFile.provider,
      cloudinaryPublicId: storedFile.publicId,
      uploadStatus: "uploaded",
      parserStatus: "parsed",
      parserMetadata: parsed.metadata,
      parsedText: parsed.text,
      retentionStatus: "retained_for_retry",
      uploadedAt: new Date(),
    })

    return toPublicCv(cv)
  } catch (error) {
    await cleanupUploadedCvAsset({
      publicId: storedFile.publicId,
      reason: "cv_db_create_failed",
    })

    throw error
  }
}

export const listUserCvs = async (params:
  | string
  | {
      userId: string
      parserStatus?: CvParserStatus
      pagination?: {
        page: number
        pageSize: number
        skip: number
        sortBy: "createdAt" | "updatedAt" | "uploadedAt" | "title"
        sortOrder: "asc" | "desc"
      }
    }): Promise<
  | PublicCv[]
  | {
      cvs: PublicCv[]
      pagination: PaginationResult
    }
> => {
  const includePagination = typeof params !== "string" && Boolean(params.pagination)
  const {
  userId,
  parserStatus,
  pagination = {
    page: 1,
    pageSize: 50,
    skip: 0,
    sortBy: "createdAt" as const,
    sortOrder: "desc" as const,
  },
} = typeof params === "string" ? { userId: params } : params

  const [cvs, totalItems] = await Promise.all([
    listCvsForUser({
      userId,
      ...(parserStatus ? { parserStatus } : {}),
      skip: pagination.skip,
      limit: pagination.pageSize,
      sortBy: pagination.sortBy,
      sortOrder: pagination.sortOrder,
    }),
    countCvsForUser({ userId, ...(parserStatus ? { parserStatus } : {}) }),
  ])

  const summaries = cvs.map(toPublicCv)

  if (!includePagination) {
    return summaries
  }

  return {
    cvs: summaries,
    pagination: createPaginationResult({
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalItems,
    }),
  }
}

export const getUserCv = async ({
  cvId,
  userId,
}: {
  cvId: string
  userId: string
}): Promise<PublicCvWithParsedText> => {
  if (!isValidObjectId(cvId)) {
    throw createNotFoundError()
  }

  const cv = await findCvByIdForUser(cvId, userId)

  if (!cv) {
    throw createNotFoundError()
  }

  return toPublicCvWithParsedText(cv)
}

export const deleteUserCv = async ({
  cvId,
  userId,
}: {
  cvId: string
  userId: string
}): Promise<{ deleted: true }> => {
  if (!isValidObjectId(cvId)) {
    throw createNotFoundError()
  }

  const cv = await findCvByIdForUser(cvId, userId)

  if (!cv) {
    throw createNotFoundError()
  }

  await deleteGeneratedDocumentsForUserByCvId({ cvId, userId })
  await deleteComparisonsForUserByCvId({ cvId, userId })
  await deleteAnalysesForUserByCvId({ cvId, userId })

  try {
    await deleteCloudinaryRawAsset({ publicId: cv.cloudinaryPublicId })
  } catch (error) {
    await markCvStorageDeletionFailed({
      cvId,
      message:
        error instanceof AppError
          ? error.code
          : "UPLOAD_STORAGE_DELETE_FAILED",
    })

    throw new AppError({
      code: "CV_STORAGE_DELETE_FAILED",
      message: "The CV file could not be deleted. Please retry.",
      statusCode: 502,
    })
  }

  await deleteCvByIdForUser({ cvId, userId })

  return { deleted: true }
}

export const recordParserFailure = async ({
  cvId,
  message,
}: {
  cvId: string
  message: string
}): Promise<void> => {
  await updateCvById(cvId, {
    $set: {
      parserStatus: "failed",
      parserError: message,
    },
  })
}
