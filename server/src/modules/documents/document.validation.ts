import { z } from "zod"

export const createCoverLetterSchema = z
  .object({
    cvId: z.string().trim().min(1),
    jobDescriptionId: z.string().trim().min(1).optional(),
    comparisonId: z.string().trim().min(1).optional(),
  })
  .strict()
  .refine((value) => value.jobDescriptionId || value.comparisonId, {
    message: "A job description or comparison is required",
    path: ["jobDescriptionId"],
  })

export const updateGeneratedDocumentSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    body: z.string().trim().min(80).max(8000),
  })
  .strict()

const trimString = (maxLength: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(maxLength)

const coverLetterResponseSchema = z.object({
  title: trimString(160),
  body: trimString(8000).refine((value) => value.length >= 80, {
    message: "Cover letter body is too short",
  }),
  notes: z.array(trimString(240)).min(0).max(8),
})

export type CreateCoverLetterInput = z.infer<typeof createCoverLetterSchema>
export type UpdateGeneratedDocumentInput = z.infer<
  typeof updateGeneratedDocumentSchema
>

export const validateAndNormalizeCoverLetter = (
  value: unknown,
): {
  title: string
  body: string
  notes: string[]
} => {
  const parsed = coverLetterResponseSchema.parse(value)

  return {
    title: parsed.title,
    body: parsed.body,
    notes: parsed.notes,
  }
}
