import type { Types } from "mongoose"
import type {
  AiProviderName,
  AiUsageMetadata,
} from "../../services/ai/ai-provider.types"

export const CV_ANALYSIS_PROMPT_VERSION = "cv-analysis-v1" as const
export const CV_ANALYSIS_PROMPT_FAMILY = "cv-analysis" as const
export const ANALYSIS_STATUSES = ["completed"] as const
export const ANALYSIS_CONFIDENCE_VALUES = ["low", "medium", "high"] as const
export const ANALYSIS_PRIORITIES = ["low", "medium", "high"] as const

export type CvAnalysisPromptVersion = typeof CV_ANALYSIS_PROMPT_VERSION
export type CvAnalysisPromptFamily = typeof CV_ANALYSIS_PROMPT_FAMILY
export type AnalysisStatus = (typeof ANALYSIS_STATUSES)[number]
export type AnalysisConfidence = (typeof ANALYSIS_CONFIDENCE_VALUES)[number]
export type AnalysisPriority = (typeof ANALYSIS_PRIORITIES)[number]

export type CvAnalysisImprovement = {
  priority: AnalysisPriority
  suggestion: string
  reason: string
}

export type StructuredCvAnalysis = {
  summary: string
  skills: string[]
  experienceHighlights: string[]
  education: string[]
  strengths: string[]
  weaknesses: string[]
  improvements: CvAnalysisImprovement[]
  confidence: AnalysisConfidence
}

export type AnalysisAiMetadata = {
  provider: AiProviderName
  modelName: string
  promptVersion: CvAnalysisPromptVersion
  promptFamily: CvAnalysisPromptFamily
  requestId?: string
  usage?: AiUsageMetadata
  durationMs?: number
  validationStatus: "valid"
}

export type CvAnalysisDocumentShape = {
  userId: Types.ObjectId
  cvId: Types.ObjectId
  analysisStatus: AnalysisStatus
  analyzedAt: Date
  structuredAnalysis: StructuredCvAnalysis
  aiMetadata: AnalysisAiMetadata
  createdAt: Date
  updatedAt: Date
}

export type PublicCvAnalysis = {
  id: string
  userId: string
  cvId: string
  analysisStatus: AnalysisStatus
  analyzedAt: string
  structuredAnalysis: StructuredCvAnalysis
  aiMetadata: AnalysisAiMetadata
  createdAt: string
  updatedAt: string
}

export type PublicCvAnalysisSummary = Omit<
  PublicCvAnalysis,
  "structuredAnalysis"
> & {
  summary: string
  confidence: AnalysisConfidence
  skillCount: number
  strengthCount: number
  improvementCount: number
}
