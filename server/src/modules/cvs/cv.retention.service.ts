import { Types } from "mongoose"

import { env } from "../../config/env"
import { logger } from "../../utils/logger"
import { deleteCloudinaryRawAsset } from "../../services/storage/cloudinary-storage"
import { deleteAnalysesForUserByCvId } from "../analyses/analysis.repository"
import { deleteComparisonsForUserByCvId } from "../comparisons/comparison.repository"
import { deleteGeneratedDocumentsForUserByCvId } from "../documents/document.repository"
import {
  findCvsEligibleForRetentionCleanup,
  markCvRetentionDeleted,
  markCvStorageDeletionFailed,
} from "./cv.repository"
import type { CvDocument } from "./cv.model"

type CleanupResult = {
  cvId: string
  userId: string
  publicId: string
  status: "deleted" | "failed" | "skipped"
  error?: string
}

type CvWithId = CvDocument & { _id: Types.ObjectId }

export const runRetentionCleanup = async (): Promise<{
  processed: number
  deleted: number
  failed: number
  results: CleanupResult[]
}> => {
  const eligibleCvs = await findCvsEligibleForRetentionCleanup({
    retentionDays: env.CV_RETENTION_DAYS,
  })

  const results: CleanupResult[] = []
  let deleted = 0
  let failed = 0

  for (const cv of eligibleCvs) {
    const result = await processCvForCleanup(cv as CvWithId)
    results.push(result)

    if (result.status === "deleted") {
      deleted++
    } else if (result.status === "failed") {
      failed++
    }
  }

  logger.info("Retention cleanup completed", {
    processed: eligibleCvs.length,
    deleted,
    failed,
  })

  return {
    processed: eligibleCvs.length,
    deleted,
    failed,
    results,
  }
}

const processCvForCleanup = async (
  cv: CvWithId,
): Promise<CleanupResult> => {
  const cvId = cv._id.toString()
  const userId = cv.userId.toString()
  const publicId = cv.cloudinaryPublicId

  try {
    await deleteCloudinaryRawAsset({ publicId })

    await Promise.all([
      deleteGeneratedDocumentsForUserByCvId({ cvId, userId }),
      deleteComparisonsForUserByCvId({ cvId, userId }),
      deleteAnalysesForUserByCvId({ cvId, userId }),
    ])

    await markCvRetentionDeleted(cvId)

    logger.info("CV retention cleanup completed", {
      cvId,
      userId,
    })

    return {
      cvId,
      userId,
      publicId,
      status: "deleted",
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error"

    await markCvStorageDeletionFailed({
      cvId,
      message: `Retention cleanup failed: ${errorMessage}`,
    })

    logger.error("CV retention cleanup failed", {
      cvId,
      userId,
      error: errorMessage,
    })

    return {
      cvId,
      userId,
      publicId,
      status: "failed",
      error: errorMessage,
    }
  }
}