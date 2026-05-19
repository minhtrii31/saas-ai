export type GeneratedDocumentType = "cover_letter"
export type GeneratedDocumentStatus = "draft"

export type GeneratedDocument = {
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
  aiMetadata: {
    provider: "gemini"
    modelName: string
    promptVersion: "cover-letter-v1"
    promptFamily: "cover-letter"
    requestId?: string
    usage?: {
      inputTokens?: number
      outputTokens?: number
      totalTokens?: number
    }
    durationMs?: number
    validationStatus: "valid"
  }
  createdAt: string
  updatedAt: string
}

export type GeneratedDocumentSummary = Omit<
  GeneratedDocument,
  "body" | "notes"
> & {
  bodyCharacterCount: number
  notesCount: number
}
