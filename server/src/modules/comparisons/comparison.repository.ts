import { ComparisonModel, type ComparisonDocument } from "./comparison.model"
import type { ComparisonDocumentShape } from "./comparison.types"

export const createComparison = async (
  comparison: Omit<ComparisonDocumentShape, "createdAt" | "updatedAt">,
): Promise<ComparisonDocument> => {
  return ComparisonModel.create(comparison)
}

export const countUserComparisonsSince = async ({
  userId,
  since,
}: {
  userId: string
  since: Date
}): Promise<number> => {
  return ComparisonModel.countDocuments({
    userId,
    comparedAt: { $gte: since },
  }).exec()
}

export const findComparisonByIdForUser = async ({
  comparisonId,
  userId,
}: {
  comparisonId: string
  userId: string
}): Promise<ComparisonDocument | null> => {
  return ComparisonModel.findOne({ _id: comparisonId, userId }).exec()
}

export const deleteComparisonByIdForUser = async ({
  comparisonId,
  userId,
}: {
  comparisonId: string
  userId: string
}): Promise<ComparisonDocument | null> => {
  return ComparisonModel.findOneAndDelete({ _id: comparisonId, userId }).exec()
}

export const deleteComparisonsForUserByCvId = async ({
  cvId,
  userId,
}: {
  cvId: string
  userId: string
}): Promise<number> => {
  const result = await ComparisonModel.deleteMany({ cvId, userId }).exec()

  return result.deletedCount
}

export const deleteComparisonsForUserByJobDescriptionId = async ({
  jobDescriptionId,
  userId,
}: {
  jobDescriptionId: string
  userId: string
}): Promise<number> => {
  const result = await ComparisonModel.deleteMany({
    jobDescriptionId,
    userId,
  }).exec()

  return result.deletedCount
}

const getComparisonFilter = ({
  userId,
  cvId,
  jobDescriptionId,
}: {
  userId: string
  cvId?: string
  jobDescriptionId?: string
}) => ({
  userId,
  ...(cvId ? { cvId } : {}),
  ...(jobDescriptionId ? { jobDescriptionId } : {}),
})

export const countComparisonsForUser = async ({
  userId,
  cvId,
  jobDescriptionId,
}: {
  userId: string
  cvId?: string
  jobDescriptionId?: string
}): Promise<number> => {
  return ComparisonModel.countDocuments(
    getComparisonFilter({
      userId,
      ...(cvId ? { cvId } : {}),
      ...(jobDescriptionId ? { jobDescriptionId } : {}),
    }),
  ).exec()
}

export const listComparisonsForUser = async ({
  userId,
  cvId,
  jobDescriptionId,
  skip,
  limit,
  sortBy,
  sortOrder,
}: {
  userId: string
  cvId?: string
  jobDescriptionId?: string
  skip: number
  limit: number
  sortBy: "createdAt" | "updatedAt" | "comparedAt"
  sortOrder: "asc" | "desc"
}): Promise<ComparisonDocument[]> => {
  return ComparisonModel.find(
    getComparisonFilter({
      userId,
      ...(cvId ? { cvId } : {}),
      ...(jobDescriptionId ? { jobDescriptionId } : {}),
    }),
  )
    .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
    .skip(skip)
    .limit(limit)
    .exec()
}
