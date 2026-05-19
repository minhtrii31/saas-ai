import type mongoose from "mongoose"

import { CvModel, type CvDocument } from "./cv.model"
import type { CvDocumentShape } from "./cv.types"

export const createCv = async (
  cv: Omit<CvDocumentShape, "createdAt" | "updatedAt">,
): Promise<CvDocument> => {
  return CvModel.create(cv)
}

export const updateCvById = async (
  cvId: string,
  update: mongoose.UpdateQuery<CvDocumentShape>,
): Promise<CvDocument | null> => {
  return CvModel.findByIdAndUpdate(cvId, update, { new: true })
    .select("+parsedText +cloudinaryPublicId +cloudinarySecureUrl")
    .exec()
}

export const markCvStorageDeletionFailed = async ({
  cvId,
  message,
}: {
  cvId: string
  message: string
}): Promise<void> => {
  await CvModel.findByIdAndUpdate(cvId, {
    $set: {
      retentionStatus: "storage_deletion_failed",
      storageDeletionAttemptedAt: new Date(),
      storageDeletionError: message,
    },
  }).exec()
}

export const findCvByIdForUser = async (
  cvId: string,
  userId: string,
): Promise<CvDocument | null> => {
  return CvModel.findOne({ _id: cvId, userId })
    .select("+parsedText +cloudinaryPublicId +cloudinarySecureUrl")
    .exec()
}

export const countCvsForUser = async ({
  userId,
  parserStatus,
}: {
  userId: string
  parserStatus?: CvDocumentShape["parserStatus"]
}): Promise<number> => {
  return CvModel.countDocuments({
    userId,
    ...(parserStatus ? { parserStatus } : {}),
  }).exec()
}

export const listCvsForUser = async ({
  userId,
  parserStatus,
  skip,
  limit,
  sortBy,
  sortOrder,
}: {
  userId: string
  parserStatus?: CvDocumentShape["parserStatus"]
  skip: number
  limit: number
  sortBy: "createdAt" | "updatedAt" | "uploadedAt" | "title"
  sortOrder: "asc" | "desc"
}): Promise<CvDocument[]> => {
  return CvModel.find({
    userId,
    ...(parserStatus ? { parserStatus } : {}),
  })
    .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
    .skip(skip)
    .limit(limit)
    .exec()
}

export const deleteCvByIdForUser = async ({
  cvId,
  userId,
}: {
  cvId: string
  userId: string
}): Promise<CvDocument | null> => {
  return CvModel.findOneAndDelete({ _id: cvId, userId })
    .select("+cloudinaryPublicId +cloudinarySecureUrl")
    .exec()
}

export const findCvsEligibleForRetentionCleanup = async ({
  retentionDays,
}: {
  retentionDays: number
}): Promise<CvDocument[]> => {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

  return CvModel.find({
    parserStatus: "parsed",
    retentionStatus: { $in: ["retained_for_retry", "ready_for_cleanup"] },
    uploadedAt: { $lt: cutoffDate },
  })
    .select("+cloudinaryPublicId +cloudinarySecureUrl")
    .exec()
}

export const markCvRetentionReadyForCleanup = async (cvId: string): Promise<void> => {
  await CvModel.findByIdAndUpdate(cvId, {
    $set: { retentionStatus: "ready_for_cleanup" },
  }).exec()
}

export const markCvRetentionDeleted = async (
  cvId: string,
): Promise<void> => {
  await CvModel.findByIdAndDelete(cvId).exec()
}
