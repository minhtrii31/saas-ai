import { z } from "zod"

import { env } from "../../config/env"

export const JOB_SEARCH_MAX_LENGTH = 120

const optionalTrimmedString = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .optional()
    .transform((value) => (value ? value : undefined))

export const createJobDescriptionSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    company: optionalTrimmedString(120),
    descriptionText: z
      .string()
      .trim()
      .min(1)
      .max(env.JOB_DESCRIPTION_MAX_CHARACTERS),
    sourceUrl: optionalTrimmedString(500),
  })
  .strict()

export const updateJobDescriptionSchema = createJobDescriptionSchema.partial()

export const jobSearchSchema = z
  .string()
  .trim()
  .max(JOB_SEARCH_MAX_LENGTH, {
    message: `Search must be ${JOB_SEARCH_MAX_LENGTH} characters or fewer`,
  })
  .optional()
  .transform((value) => (value ? value : undefined))

export type CreateJobDescriptionInput = z.infer<
  typeof createJobDescriptionSchema
>
export type UpdateJobDescriptionInput = z.infer<
  typeof updateJobDescriptionSchema
>
export type JobSearchInput = z.infer<typeof jobSearchSchema>
