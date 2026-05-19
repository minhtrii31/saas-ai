import type {
  CvJobComparison,
  CvJobComparisonSummary,
} from "@/types/comparison"

import { apiRequest } from "./client"

export const comparisonsApi = {
  compare(
    payload: { cvId: string; jobDescriptionId: string },
    accessToken: string | null
  ) {
    return apiRequest<{ comparison: CvJobComparison }>("/api/comparisons", {
      method: "POST",
      body: payload,
      accessToken,
    })
  },

  list(accessToken: string | null) {
    return apiRequest<{ comparisons: CvJobComparisonSummary[] }>(
      "/api/comparisons",
      {
        accessToken,
      }
    )
  },

  get(comparisonId: string, accessToken: string | null) {
    return apiRequest<{ comparison: CvJobComparison }>(
      `/api/comparisons/${comparisonId}`,
      {
        accessToken,
      }
    )
  },

  delete(comparisonId: string, accessToken: string | null) {
    return apiRequest<{ deleted: true }>(`/api/comparisons/${comparisonId}`, {
      method: "DELETE",
      accessToken,
    })
  },
}
