import type { CvAnalysis, CvAnalysisSummary } from "@/types/analysis"

import { apiRequest } from "./client"

export const analysesApi = {
  analyzeCv(cvId: string, accessToken: string | null) {
    return apiRequest<{ analysis: CvAnalysis }>(`/api/cvs/${cvId}/analyze`, {
      method: "POST",
      accessToken,
    })
  },

  list(accessToken: string | null) {
    return apiRequest<{ analyses: CvAnalysisSummary[] }>("/api/analyses", {
      accessToken,
    })
  },

  get(analysisId: string, accessToken: string | null) {
    return apiRequest<{ analysis: CvAnalysis }>(`/api/analyses/${analysisId}`, {
      accessToken,
    })
  },

  delete(analysisId: string, accessToken: string | null) {
    return apiRequest<{ deleted: true }>(`/api/analyses/${analysisId}`, {
      method: "DELETE",
      accessToken,
    })
  },
}
