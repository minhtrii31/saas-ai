import type { Types } from "mongoose"

export const CV_UPLOAD_STATUSES = ["uploaded"] as const
export const CV_PARSER_STATUSES = ["pending", "parsed", "failed"] as const
export const CV_RETENTION_STATUSES = [
  "retained_for_retry",
  "storage_deletion_failed",
  "ready_for_cleanup",
] as const
export const CV_STORAGE_PROVIDERS = ["cloudinary"] as const

export type CvUploadStatus = (typeof CV_UPLOAD_STATUSES)[number]
export type CvParserStatus = (typeof CV_PARSER_STATUSES)[number]
export type CvRetentionStatus = (typeof CV_RETENTION_STATUSES)[number]
export type CvStorageProvider = (typeof CV_STORAGE_PROVIDERS)[number]

export type CvParserMetadata = {
  parser: "pdf-parse" | "mammoth"
  pageCount?: number
  characterCount: number
  warnings?: string[]
}

export type CvDocumentShape = {
  userId: Types.ObjectId
  title: string
  originalFileName: string
  mimeType: string
  fileSize: number
  storageProvider: CvStorageProvider
  cloudinaryPublicId: string
  cloudinarySecureUrl?: string
  uploadStatus: CvUploadStatus
  parsedText?: string
  parserStatus: CvParserStatus
  parserError?: string
  parserMetadata?: CvParserMetadata
  retentionStatus: CvRetentionStatus
  storageDeletionAttemptedAt?: Date
  storageDeletionError?: string
  uploadedAt: Date
  createdAt: Date
  updatedAt: Date
}

export type PublicCv = {
  id: string
  title: string
  originalFileName: string
  mimeType: string
  fileSize: number
  storageProvider: CvStorageProvider
  uploadStatus: CvUploadStatus
  parserStatus: CvParserStatus
  parserError?: string
  parserMetadata?: CvParserMetadata
  retentionStatus: CvRetentionStatus
  storageDeletionAttemptedAt?: string
  uploadedAt: string
  createdAt: string
  updatedAt: string
  hasParsedText: boolean
  parsedTextCharacterCount: number
}

export type PublicCvWithParsedText = PublicCv & {
  parsedText?: string
}
