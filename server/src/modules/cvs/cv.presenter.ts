import type { CvDocument } from "./cv.model"
import type { PublicCv, PublicCvWithParsedText } from "./cv.types"

const toIso = (value: Date): string => value.toISOString()

export const toPublicCv = (cv: CvDocument): PublicCv => {
  const parsedText = cv.parsedText ?? ""

  return {
    id: cv._id.toString(),
    title: cv.title,
    originalFileName: cv.originalFileName,
    mimeType: cv.mimeType,
    fileSize: cv.fileSize,
    storageProvider: cv.storageProvider,
    uploadStatus: cv.uploadStatus,
    parserStatus: cv.parserStatus,
    ...(cv.parserError ? { parserError: cv.parserError } : {}),
    ...(cv.parserMetadata ? { parserMetadata: cv.parserMetadata } : {}),
    retentionStatus: cv.retentionStatus,
    ...(cv.storageDeletionAttemptedAt
      ? { storageDeletionAttemptedAt: toIso(cv.storageDeletionAttemptedAt) }
      : {}),
    uploadedAt: toIso(cv.uploadedAt),
    createdAt: toIso(cv.createdAt),
    updatedAt: toIso(cv.updatedAt),
    hasParsedText: parsedText.length > 0,
    parsedTextCharacterCount: parsedText.length,
  }
}

export const toPublicCvWithParsedText = (
  cv: CvDocument,
): PublicCvWithParsedText => {
  const publicCv = toPublicCv(cv)

  return {
    ...publicCv,
    ...(cv.parsedText ? { parsedText: cv.parsedText } : {}),
  }
}
