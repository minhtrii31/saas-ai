import { z } from "zod"

import type { StructuredCvAnalysis } from "./analysis.types"

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

const cvAnalysisResponseSchema = z
  .object({
    summary: trimString(1200),
    skills: boundedStringArray({ itemMaxLength: 120, maxItems: 12 }),
    experienceHighlights: boundedStringArray({
      itemMaxLength: 220,
      maxItems: 8,
    }),
    education: boundedStringArray({ itemMaxLength: 220, maxItems: 8 }),
    strengths: boundedStringArray({ itemMaxLength: 220, maxItems: 8 }),
    weaknesses: boundedStringArray({ itemMaxLength: 220, maxItems: 8 }),
    improvements: z
      .array(
        z.object({
          priority: z.enum(["low", "medium", "high"]),
          suggestion: trimString(260),
          reason: trimString(320),
        }),
      )
      .min(1)
      .max(8),
    confidence: z.enum(["low", "medium", "high"]),
  })

export const validateAndNormalizeCvAnalysis = (
  value: unknown,
): StructuredCvAnalysis => {
  const parsed = cvAnalysisResponseSchema.parse(value)

  return {
    summary: parsed.summary,
    skills: parsed.skills,
    experienceHighlights: parsed.experienceHighlights,
    education: parsed.education,
    strengths: parsed.strengths,
    weaknesses: parsed.weaknesses,
    improvements: parsed.improvements,
    confidence: parsed.confidence,
  }
}
