import type {
  GeneratedDocument,
  GeneratedDocumentSummary,
} from "@/types/document"

import { apiRequest } from "./client"

export const documentsApi = {
  generateCoverLetter(
    payload: {
      cvId: string
      jobDescriptionId?: string
      comparisonId?: string
    },
    accessToken: string | null
  ) {
    return apiRequest<{ document: GeneratedDocument }>(
      "/api/documents/cover-letter",
      {
        method: "POST",
        body: payload,
        accessToken,
      }
    )
  },

  list(accessToken: string | null) {
    return apiRequest<{ documents: GeneratedDocumentSummary[] }>(
      "/api/documents?type=cover_letter",
      {
        accessToken,
      }
    )
  },

  get(documentId: string, accessToken: string | null) {
    return apiRequest<{ document: GeneratedDocument }>(
      `/api/documents/${documentId}`,
      {
        accessToken,
      }
    )
  },

  update(
    documentId: string,
    payload: { title?: string; body: string },
    accessToken: string | null
  ) {
    return apiRequest<{ document: GeneratedDocument }>(
      `/api/documents/${documentId}`,
      {
        method: "PATCH",
        body: payload,
        accessToken,
      }
    )
  },

  delete(documentId: string, accessToken: string | null) {
    return apiRequest<{ deleted: true }>(`/api/documents/${documentId}`, {
      method: "DELETE",
      accessToken,
    })
  },
}
