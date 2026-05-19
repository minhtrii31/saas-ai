import {
  CvAnalysisModel,
  type CvAnalysisDocument,
} from "./analysis.model"
import type { CvAnalysisDocumentShape } from "./analysis.types"

export const createCvAnalysis = async (
  analysis: Omit<CvAnalysisDocumentShape, "createdAt" | "updatedAt">,
): Promise<CvAnalysisDocument> => {
  return CvAnalysisModel.create(analysis)
}

export const countUserAnalysesSince = async ({
  userId,
  since,
}: {
  userId: string
  since: Date
}): Promise<number> => {
  return CvAnalysisModel.countDocuments({
    userId,
    analyzedAt: { $gte: since },
  }).exec()
}

export const findAnalysisByIdForUser = async ({
  analysisId,
  userId,
}: {
  analysisId: string
  userId: string
}): Promise<CvAnalysisDocument | null> => {
  return CvAnalysisModel.findOne({ _id: analysisId, userId }).exec()
}

export const deleteAnalysisByIdForUser = async ({
  analysisId,
  userId,
}: {
  analysisId: string
  userId: string
}): Promise<CvAnalysisDocument | null> => {
  return CvAnalysisModel.findOneAndDelete({ _id: analysisId, userId }).exec()
}

export const deleteAnalysesForUserByCvId = async ({
  cvId,
  userId,
}: {
  cvId: string
  userId: string
}): Promise<number> => {
  const result = await CvAnalysisModel.deleteMany({ cvId, userId }).exec()

  return result.deletedCount
}

const getAnalysisFilter = ({
  userId,
  cvId,
}: {
  userId: string
  cvId?: string
}) => ({
  userId,
  ...(cvId ? { cvId } : {}),
})

export const countAnalysesForUser = async ({
  userId,
  cvId,
}: {
  userId: string
  cvId?: string
}): Promise<number> => {
  return CvAnalysisModel.countDocuments(
    getAnalysisFilter({ userId, ...(cvId ? { cvId } : {}) }),
  ).exec()
}

export const listAnalysesForUser = async ({
  userId,
  cvId,
  skip,
  limit,
  sortBy,
  sortOrder,
}: {
  userId: string
  cvId?: string
  skip: number
  limit: number
  sortBy: "createdAt" | "updatedAt" | "analyzedAt"
  sortOrder: "asc" | "desc"
}): Promise<CvAnalysisDocument[]> => {
  return CvAnalysisModel.find(
    getAnalysisFilter({ userId, ...(cvId ? { cvId } : {}) }),
  )
    .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
    .skip(skip)
    .limit(limit)
    .exec()
}
