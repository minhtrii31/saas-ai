import type { Cv, CvWithParsedText } from "@/types/cv"

import { apiFormRequest, apiRequest } from "./client"

export const cvsApi = {
  upload(file: File, accessToken: string | null) {
    const formData = new FormData()
    formData.append("file", file)

    return apiFormRequest<{ cv: Cv }>("/api/cvs", {
      method: "POST",
      body: formData,
      accessToken,
    })
  },

  list(accessToken: string | null) {
    return apiRequest<{ cvs: Cv[] }>("/api/cvs", {
      accessToken,
    })
  },

  get(cvId: string, accessToken: string | null) {
    return apiRequest<{ cv: CvWithParsedText }>(`/api/cvs/${cvId}`, {
      accessToken,
    })
  },

  delete(cvId: string, accessToken: string | null) {
    return apiRequest<{ deleted: true }>(`/api/cvs/${cvId}`, {
      method: "DELETE",
      accessToken,
    })
  },
}
