import { z } from "zod"

import type { StructuredJobComparison } from "./comparison.types"

export const createComparisonSchema = z
  .object({
    cvId: z.string().trim().min(1),
    jobDescriptionId: z.string().trim().min(1),
  })
  .strict()

const trimString = (maxLength: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(maxLength)

const boundedStringArray = ({
  itemMaxLength,
  maxItems,
}: {
  itemMaxLength: number
  maxItems: number
}) => z.array(trimString(itemMaxLength)).min(0).max(maxItems)

const comparisonResponseSchema = z.object({
  fitScore: z.number().int().min(0).max(100),
  scoreReason: trimString(1200),
  strengths: boundedStringArray({ itemMaxLength: 220, maxItems: 8 }),
  weaknesses: boundedStringArray({ itemMaxLength: 220, maxItems: 8 }),
  missingRequirements: boundedStringArray({
    itemMaxLength: 220,
    maxItems: 8,
  }),
  matchedSkills: boundedStringArray({ itemMaxLength: 120, maxItems: 16 }),
  missingSkills: boundedStringArray({ itemMaxLength: 120, maxItems: 16 }),
  applicationAdvice: boundedStringArray({ itemMaxLength: 260, maxItems: 8 }),
  confidence: z.enum(["low", "medium", "high"]),
  evidenceNotes: boundedStringArray({ itemMaxLength: 260, maxItems: 8 }),
})

export type CreateComparisonInput = z.infer<typeof createComparisonSchema>

export const validateAndNormalizeComparison = (
  value: unknown,
): StructuredJobComparison => {
  const parsed = comparisonResponseSchema.parse(value)

  return {
    fitScore: parsed.fitScore,
    scoreReason: parsed.scoreReason,
    strengths: parsed.strengths,
    weaknesses: parsed.weaknesses,
    missingRequirements: parsed.missingRequirements,
    matchedSkills: parsed.matchedSkills,
    missingSkills: parsed.missingSkills,
    applicationAdvice: parsed.applicationAdvice,
    confidence: parsed.confidence,
    evidenceNotes: parsed.evidenceNotes,
  }
}
