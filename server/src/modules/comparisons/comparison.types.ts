import type { Types } from "mongoose"
import type {
  AiProviderName,
  AiUsageMetadata,
} from "../../services/ai/ai-provider.types"

export const JD_MATCH_PROMPT_VERSION = "jd-match-v1" as const
export const JD_MATCH_PROMPT_FAMILY = "jd-match" as const
export const COMPARISON_STATUSES = ["completed"] as const
export const COMPARISON_CONFIDENCE_VALUES = ["low", "medium", "high"] as const

export type JdMatchPromptVersion = typeof JD_MATCH_PROMPT_VERSION
export type JdMatchPromptFamily = typeof JD_MATCH_PROMPT_FAMILY
export type ComparisonStatus = (typeof COMPARISON_STATUSES)[number]
export type ComparisonConfidence =
  (typeof COMPARISON_CONFIDENCE_VALUES)[number]

export type StructuredJobComparison = {
  fitScore: number
  scoreReason: string
  strengths: string[]
  weaknesses: string[]
  missingRequirements: string[]
  matchedSkills: string[]
  missingSkills: string[]
  applicationAdvice: string[]
  confidence: ComparisonConfidence
  evidenceNotes: string[]
}

export type ComparisonAiMetadata = {
  provider: AiProviderName
  modelName: string
  promptVersion: JdMatchPromptVersion
  promptFamily: JdMatchPromptFamily
  requestId?: string
  usage?: AiUsageMetadata
  durationMs?: number
  validationStatus: "valid"
}

export type ComparisonDocumentShape = {
  userId: Types.ObjectId
  cvId: Types.ObjectId
  jobDescriptionId: Types.ObjectId
  comparisonStatus: ComparisonStatus
  comparedAt: Date
  structuredComparison: StructuredJobComparison
  aiMetadata: ComparisonAiMetadata
  createdAt: Date
  updatedAt: Date
}

export type PublicComparison = {
  id: string
  userId: string
  cvId: string
  jobDescriptionId: string
  comparisonStatus: ComparisonStatus
  comparedAt: string
  structuredComparison: StructuredJobComparison
  aiMetadata: ComparisonAiMetadata
  createdAt: string
  updatedAt: string
}

export type PublicComparisonSummary = Omit<
  PublicComparison,
  "structuredComparison"
> & {
  fitScore: number
  scoreReason: string
  confidence: ComparisonConfidence
  matchedSkillCount: number
  missingSkillCount: number
}
