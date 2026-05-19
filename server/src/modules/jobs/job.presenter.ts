import type { JobDescriptionDocument } from "./job.model"
import type {
  PublicJobDescription,
  PublicJobDescriptionSummary,
} from "./job.types"

export const toPublicJobDescriptionSummary = (
  job: JobDescriptionDocument,
): PublicJobDescriptionSummary => {
  return {
    id: job._id.toString(),
    userId: job.userId.toString(),
    title: job.title,
    ...(job.company ? { company: job.company } : {}),
    descriptionTextCharacterCount: job.descriptionText.length,
    hasDescriptionText: job.descriptionText.length > 0,
    inputType: job.inputType,
    ...(job.sourceUrl ? { sourceUrl: job.sourceUrl } : {}),
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  }
}

export const toPublicJobDescription = (
  job: JobDescriptionDocument,
): PublicJobDescription => {
  return {
    ...toPublicJobDescriptionSummary(job),
    descriptionText: job.descriptionText,
  }
}
