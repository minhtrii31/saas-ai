import type { GeneratedDocumentDocument } from "./document.model"
import type {
  PublicGeneratedDocument,
  PublicGeneratedDocumentSummary,
} from "./document.types"

export const toPublicGeneratedDocumentSummary = (
  document: GeneratedDocumentDocument,
): PublicGeneratedDocumentSummary => {
  return {
    id: document._id.toString(),
    userId: document.userId.toString(),
    type: document.type,
    status: document.status,
    ...(document.cvId ? { cvId: document.cvId.toString() } : {}),
    ...(document.jobDescriptionId
      ? { jobDescriptionId: document.jobDescriptionId.toString() }
      : {}),
    ...(document.comparisonId
      ? { comparisonId: document.comparisonId.toString() }
      : {}),
    title: document.title,
    bodyCharacterCount: document.body.length,
    notesCount: document.notes.length,
    generatedAt: document.generatedAt.toISOString(),
    aiMetadata: document.aiMetadata,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  }
}

export const toPublicGeneratedDocument = (
  document: GeneratedDocumentDocument,
): PublicGeneratedDocument => {
  return {
    ...toPublicGeneratedDocumentSummary(document),
    body: document.body,
    notes: document.notes,
  }
}
