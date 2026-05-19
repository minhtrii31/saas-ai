export type CvParserStatus = "pending" | "parsed" | "failed"
export type CvUploadStatus = "uploaded"
export type CvStorageProvider = "cloudinary"
export type CvRetentionStatus =
  | "retained_for_retry"
  | "storage_deletion_failed"
  | "ready_for_cleanup"

export type CvParserMetadata = {
  parser: "pdf-parse" | "mammoth"
  pageCount?: number
  characterCount: number
  warnings?: string[]
}

export type Cv = {
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

export type CvWithParsedText = Cv & {
  parsedText?: string
}
