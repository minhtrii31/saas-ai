export type AnalysisStatus = "completed"
export type AnalysisConfidence = "low" | "medium" | "high"
export type AnalysisPriority = "low" | "medium" | "high"

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

export type CvAnalysis = {
  id: string
  userId: string
  cvId: string
  analysisStatus: AnalysisStatus
  analyzedAt: string
  structuredAnalysis: StructuredCvAnalysis
  aiMetadata: {
    provider: "gemini"
    modelName: string
    promptVersion: "cv-analysis-v1"
    promptFamily: "cv-analysis"
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

export type CvAnalysisSummary = Omit<CvAnalysis, "structuredAnalysis"> & {
  summary: string
  confidence: AnalysisConfidence
  skillCount: number
  strengthCount: number
  improvementCount: number
}
