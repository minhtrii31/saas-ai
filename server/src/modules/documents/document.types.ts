import type { Types } from "mongoose"

import type {
  AiProviderName,
  AiUsageMetadata,
} from "../../services/ai/ai-provider.types"

export const COVER_LETTER_PROMPT_VERSION = "cover-letter-v1" as const
export const COVER_LETTER_PROMPT_FAMILY = "cover-letter" as const
export const GENERATED_DOCUMENT_TYPES = ["cover_letter"] as const
export const GENERATED_DOCUMENT_STATUSES = ["draft"] as const

export type CoverLetterPromptVersion = typeof COVER_LETTER_PROMPT_VERSION
export type CoverLetterPromptFamily = typeof COVER_LETTER_PROMPT_FAMILY
export type GeneratedDocumentType = (typeof GENERATED_DOCUMENT_TYPES)[number]
export type GeneratedDocumentStatus =
  (typeof GENERATED_DOCUMENT_STATUSES)[number]

export type GeneratedDocumentAiMetadata = {
  provider: AiProviderName
  modelName: string
  promptVersion: CoverLetterPromptVersion
  promptFamily: CoverLetterPromptFamily
  requestId?: string
  usage?: AiUsageMetadata
  durationMs?: number
  validationStatus: "valid"
}

export type GeneratedDocumentShape = {
  userId: Types.ObjectId
  type: GeneratedDocumentType
  status: GeneratedDocumentStatus
  cvId?: Types.ObjectId
  jobDescriptionId?: Types.ObjectId
  comparisonId?: Types.ObjectId
  title: string
  body: string
  notes: string[]
  generatedAt: Date
  aiMetadata: GeneratedDocumentAiMetadata
  createdAt: Date
  updatedAt: Date
}

export type PublicGeneratedDocument = {
  id: string
  userId: string
  type: GeneratedDocumentType
  status: GeneratedDocumentStatus
  cvId?: string
  jobDescriptionId?: string
  comparisonId?: string
  title: string
  body: string
  notes: string[]
  generatedAt: string
  aiMetadata: GeneratedDocumentAiMetadata
  createdAt: string
  updatedAt: string
}

export type PublicGeneratedDocumentSummary = Omit<
  PublicGeneratedDocument,
  "body" | "notes"
> & {
  bodyCharacterCount: number
  notesCount: number
}
