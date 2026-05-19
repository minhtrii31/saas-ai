import type { JobDescription, JobDescriptionSummary } from "@/types/job"

import { apiRequest } from "./client"

export type CreateJobDescriptionPayload = {
  title: string
  company?: string
  descriptionText: string
  sourceUrl?: string
}

export const jobsApi = {
  create(payload: CreateJobDescriptionPayload, accessToken: string | null) {
    return apiRequest<{ job: JobDescription }>("/api/jobs", {
      method: "POST",
      body: payload,
      accessToken,
    })
  },

  list(accessToken: string | null) {
    return apiRequest<{ jobs: JobDescriptionSummary[] }>("/api/jobs", {
      accessToken,
    })
  },

  get(jobId: string, accessToken: string | null) {
    return apiRequest<{ job: JobDescription }>(`/api/jobs/${jobId}`, {
      accessToken,
    })
  },

  delete(jobId: string, accessToken: string | null) {
    return apiRequest<{ deleted: true }>(`/api/jobs/${jobId}`, {
      method: "DELETE",
      accessToken,
    })
  },
}
