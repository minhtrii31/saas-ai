import type { ComparisonDocument } from "./comparison.model"
import type {
  PublicComparison,
  PublicComparisonSummary,
} from "./comparison.types"

export const toPublicComparison = (
  comparison: ComparisonDocument,
): PublicComparison => {
  return {
    id: comparison._id.toString(),
    userId: comparison.userId.toString(),
    cvId: comparison.cvId.toString(),
    jobDescriptionId: comparison.jobDescriptionId.toString(),
    comparisonStatus: comparison.comparisonStatus,
    comparedAt: comparison.comparedAt.toISOString(),
    structuredComparison: comparison.structuredComparison,
    aiMetadata: comparison.aiMetadata,
    createdAt: comparison.createdAt.toISOString(),
    updatedAt: comparison.updatedAt.toISOString(),
  }
}

export const toPublicComparisonSummary = (
  comparison: ComparisonDocument,
): PublicComparisonSummary => {
  return {
    id: comparison._id.toString(),
    userId: comparison.userId.toString(),
    cvId: comparison.cvId.toString(),
    jobDescriptionId: comparison.jobDescriptionId.toString(),
    comparisonStatus: comparison.comparisonStatus,
    comparedAt: comparison.comparedAt.toISOString(),
    fitScore: comparison.structuredComparison.fitScore,
    scoreReason: comparison.structuredComparison.scoreReason,
    confidence: comparison.structuredComparison.confidence,
    matchedSkillCount: comparison.structuredComparison.matchedSkills.length,
    missingSkillCount: comparison.structuredComparison.missingSkills.length,
    aiMetadata: comparison.aiMetadata,
    createdAt: comparison.createdAt.toISOString(),
    updatedAt: comparison.updatedAt.toISOString(),
  }
}
