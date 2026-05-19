import type { CvAnalysisDocument } from "./analysis.model"
import type { PublicCvAnalysis, PublicCvAnalysisSummary } from "./analysis.types"

const toIso = (value: Date): string => value.toISOString()

export const toPublicCvAnalysis = (
  analysis: CvAnalysisDocument,
): PublicCvAnalysis => {
  return {
    id: analysis._id.toString(),
    userId: analysis.userId.toString(),
    cvId: analysis.cvId.toString(),
    analysisStatus: analysis.analysisStatus,
    analyzedAt: toIso(analysis.analyzedAt),
    structuredAnalysis: analysis.structuredAnalysis,
    aiMetadata: analysis.aiMetadata,
    createdAt: toIso(analysis.createdAt),
    updatedAt: toIso(analysis.updatedAt),
  }
}

export const toPublicCvAnalysisSummary = (
  analysis: CvAnalysisDocument,
): PublicCvAnalysisSummary => {
  return {
    id: analysis._id.toString(),
    userId: analysis.userId.toString(),
    cvId: analysis.cvId.toString(),
    analysisStatus: analysis.analysisStatus,
    analyzedAt: toIso(analysis.analyzedAt),
    summary: analysis.structuredAnalysis.summary,
    confidence: analysis.structuredAnalysis.confidence,
    skillCount: analysis.structuredAnalysis.skills.length,
    strengthCount: analysis.structuredAnalysis.strengths.length,
    improvementCount: analysis.structuredAnalysis.improvements.length,
    aiMetadata: analysis.aiMetadata,
    createdAt: toIso(analysis.createdAt),
    updatedAt: toIso(analysis.updatedAt),
  }
}
