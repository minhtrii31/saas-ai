import { GeneratedDocumentModel, type GeneratedDocumentDocument } from "./document.model"
import type {
  GeneratedDocumentShape,
  GeneratedDocumentType,
} from "./document.types"

export const createGeneratedDocument = async (
  document: Omit<GeneratedDocumentShape, "createdAt" | "updatedAt">,
): Promise<GeneratedDocumentDocument> => {
  return GeneratedDocumentModel.create(document)
}

export const countUserGeneratedDocumentsSince = async ({
  userId,
  type,
  since,
}: {
  userId: string
  type: GeneratedDocumentType
  since: Date
}): Promise<number> => {
  return GeneratedDocumentModel.countDocuments({
    userId,
    type,
    generatedAt: { $gte: since },
  }).exec()
}

export const findGeneratedDocumentByIdForUser = async ({
  documentId,
  userId,
}: {
  documentId: string
  userId: string
}): Promise<GeneratedDocumentDocument | null> => {
  return GeneratedDocumentModel.findOne({ _id: documentId, userId }).exec()
}

export const deleteGeneratedDocumentByIdForUser = async ({
  documentId,
  userId,
}: {
  documentId: string
  userId: string
}): Promise<GeneratedDocumentDocument | null> => {
  return GeneratedDocumentModel.findOneAndDelete({
    _id: documentId,
    userId,
  }).exec()
}

export const deleteGeneratedDocumentsForUserByCvId = async ({
  cvId,
  userId,
}: {
  cvId: string
  userId: string
}): Promise<number> => {
  const result = await GeneratedDocumentModel.deleteMany({ cvId, userId }).exec()

  return result.deletedCount
}

export const deleteGeneratedDocumentsForUserByJobDescriptionId = async ({
  jobDescriptionId,
  userId,
}: {
  jobDescriptionId: string
  userId: string
}): Promise<number> => {
  const result = await GeneratedDocumentModel.deleteMany({
    jobDescriptionId,
    userId,
  }).exec()

  return result.deletedCount
}

export const deleteGeneratedDocumentsForUserByComparisonId = async ({
  comparisonId,
  userId,
}: {
  comparisonId: string
  userId: string
}): Promise<number> => {
  const result = await GeneratedDocumentModel.deleteMany({
    comparisonId,
    userId,
  }).exec()

  return result.deletedCount
}

const getGeneratedDocumentFilter = ({
  userId,
  type,
  status,
  cvId,
  jobDescriptionId,
  comparisonId,
}: {
  userId: string
  type?: GeneratedDocumentType
  status?: GeneratedDocumentShape["status"]
  cvId?: string
  jobDescriptionId?: string
  comparisonId?: string
}) => ({
  userId,
  ...(type ? { type } : {}),
  ...(status ? { status } : {}),
  ...(cvId ? { cvId } : {}),
  ...(jobDescriptionId ? { jobDescriptionId } : {}),
  ...(comparisonId ? { comparisonId } : {}),
})

export const countGeneratedDocumentsForUser = async ({
  userId,
  type,
  status,
  cvId,
  jobDescriptionId,
  comparisonId,
}: {
  userId: string
  type?: GeneratedDocumentType
  status?: GeneratedDocumentShape["status"]
  cvId?: string
  jobDescriptionId?: string
  comparisonId?: string
}): Promise<number> => {
  return GeneratedDocumentModel.countDocuments(
    getGeneratedDocumentFilter({
      userId,
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
      ...(cvId ? { cvId } : {}),
      ...(jobDescriptionId ? { jobDescriptionId } : {}),
      ...(comparisonId ? { comparisonId } : {}),
    }),
  ).exec()
}

export const listGeneratedDocumentsForUser = async ({
  userId,
  type,
  status,
  cvId,
  jobDescriptionId,
  comparisonId,
  skip,
  limit,
  sortBy,
  sortOrder,
}: {
  userId: string
  type?: GeneratedDocumentType
  status?: GeneratedDocumentShape["status"]
  cvId?: string
  jobDescriptionId?: string
  comparisonId?: string
  skip: number
  limit: number
  sortBy: "createdAt" | "updatedAt" | "generatedAt" | "title"
  sortOrder: "asc" | "desc"
}): Promise<GeneratedDocumentDocument[]> => {
  return GeneratedDocumentModel.find(
    getGeneratedDocumentFilter({
      userId,
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
      ...(cvId ? { cvId } : {}),
      ...(jobDescriptionId ? { jobDescriptionId } : {}),
      ...(comparisonId ? { comparisonId } : {}),
    }),
  )
    .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
    .skip(skip)
    .limit(limit)
    .exec()
}

export const updateGeneratedDocumentBodyForUser = async ({
  documentId,
  userId,
  title,
  body,
}: {
  documentId: string
  userId: string
  title?: string
  body: string
}): Promise<GeneratedDocumentDocument | null> => {
  return GeneratedDocumentModel.findOneAndUpdate(
    { _id: documentId, userId },
    {
      ...(title ? { title } : {}),
      body,
    },
    { returnDocument: "after" },
  ).exec()
}
