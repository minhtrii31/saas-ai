export type ComparisonStatus = "completed"
export type ComparisonConfidence = "low" | "medium" | "high"

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

export type CvJobComparison = {
  id: string
  userId: string
  cvId: string
  jobDescriptionId: string
  comparisonStatus: ComparisonStatus
  comparedAt: string
  structuredComparison: StructuredJobComparison
  aiMetadata: {
    provider: "gemini"
    modelName: string
    promptVersion: "jd-match-v1"
    promptFamily: "jd-match"
    requestId?: string
    usage?: {
      inputTokens?: number
      outputTokens?: number
      totalTokens?: number
    }
    durationMs?: number
    validationStatus: "valid"
  }
  createdAt: string
  updatedAt: string
}

export type CvJobComparisonSummary = Omit<
  CvJobComparison,
  "structuredComparison"
> & {
  fitScore: number
  scoreReason: string
  confidence: ComparisonConfidence
  matchedSkillCount: number
  missingSkillCount: number
}
