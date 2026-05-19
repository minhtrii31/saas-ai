import { Schema, model, models, type HydratedDocument, type Model } from "mongoose"

import {
  COMPARISON_CONFIDENCE_VALUES,
  COMPARISON_STATUSES,
  type ComparisonDocumentShape,
} from "./comparison.types"

export type ComparisonDocument = HydratedDocument<ComparisonDocumentShape>

const structuredComparisonSchema = new Schema(
  {
    fitScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    scoreReason: {
      type: String,
      required: true,
      trim: true,
    },
    strengths: {
      type: [String],
      required: true,
    },
    weaknesses: {
      type: [String],
      required: true,
    },
    missingRequirements: {
      type: [String],
      required: true,
    },
    matchedSkills: {
      type: [String],
      required: true,
    },
    missingSkills: {
      type: [String],
      required: true,
    },
    applicationAdvice: {
      type: [String],
      required: true,
    },
    confidence: {
      type: String,
      enum: COMPARISON_CONFIDENCE_VALUES,
      required: true,
    },
    evidenceNotes: {
      type: [String],
      required: true,
    },
  },
  {
    _id: false,
    versionKey: false,
  },
)

const aiMetadataSchema = new Schema(
  {
    provider: {
      type: String,
      enum: ["gemini"],
      required: true,
    },
    modelName: {
      type: String,
      required: true,
    },
    promptVersion: {
      type: String,
      required: true,
    },
    promptFamily: {
      type: String,
      required: true,
    },
    requestId: {
      type: String,
    },
    usage: {
      inputTokens: Number,
      outputTokens: Number,
      totalTokens: Number,
    },
    durationMs: {
      type: Number,
      min: 0,
    },
    validationStatus: {
      type: String,
      enum: ["valid"],
      required: true,
    },
  },
  {
    _id: false,
    versionKey: false,
  },
)

const comparisonSchema = new Schema<ComparisonDocumentShape>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    cvId: {
      type: Schema.Types.ObjectId,
      ref: "Cv",
      required: true,
      index: true,
    },
    jobDescriptionId: {
      type: Schema.Types.ObjectId,
      ref: "JobDescription",
      required: true,
      index: true,
    },
    comparisonStatus: {
      type: String,
      enum: COMPARISON_STATUSES,
      required: true,
    },
    comparedAt: {
      type: Date,
      required: true,
      index: true,
    },
    structuredComparison: {
      type: structuredComparisonSchema,
      required: true,
    },
    aiMetadata: {
      type: aiMetadataSchema,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

comparisonSchema.index({
  userId: 1,
  cvId: 1,
  jobDescriptionId: 1,
  createdAt: -1,
})
comparisonSchema.index({ userId: 1, createdAt: -1 })

export const ComparisonModel: Model<ComparisonDocumentShape> =
  (models.Comparison as Model<ComparisonDocumentShape> | undefined) ??
  model<ComparisonDocumentShape>("Comparison", comparisonSchema)
