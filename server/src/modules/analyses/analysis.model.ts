import { Schema, model, models, type HydratedDocument, type Model } from "mongoose"

import {
  ANALYSIS_CONFIDENCE_VALUES,
  ANALYSIS_PRIORITIES,
  ANALYSIS_STATUSES,
  type CvAnalysisDocumentShape,
} from "./analysis.types"

export type CvAnalysisDocument = HydratedDocument<CvAnalysisDocumentShape>

const improvementSchema = new Schema(
  {
    priority: {
      type: String,
      enum: ANALYSIS_PRIORITIES,
      required: true,
    },
    suggestion: {
      type: String,
      required: true,
      trim: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    _id: false,
    versionKey: false,
  },
)

const structuredAnalysisSchema = new Schema(
  {
    summary: {
      type: String,
      required: true,
      trim: true,
    },
    skills: {
      type: [String],
      required: true,
    },
    experienceHighlights: {
      type: [String],
      required: true,
    },
    education: {
      type: [String],
      required: true,
    },
    strengths: {
      type: [String],
      required: true,
    },
    weaknesses: {
      type: [String],
      required: true,
    },
    improvements: {
      type: [improvementSchema],
      required: true,
    },
    confidence: {
      type: String,
      enum: ANALYSIS_CONFIDENCE_VALUES,
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

const cvAnalysisSchema = new Schema<CvAnalysisDocumentShape>(
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
    analysisStatus: {
      type: String,
      enum: ANALYSIS_STATUSES,
      required: true,
    },
    analyzedAt: {
      type: Date,
      required: true,
      index: true,
    },
    structuredAnalysis: {
      type: structuredAnalysisSchema,
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

cvAnalysisSchema.index({ userId: 1, cvId: 1, createdAt: -1 })
cvAnalysisSchema.index({ userId: 1, analyzedAt: -1 })

export const CvAnalysisModel: Model<CvAnalysisDocumentShape> =
  (models.CvAnalysis as Model<CvAnalysisDocumentShape> | undefined) ??
  model<CvAnalysisDocumentShape>("CvAnalysis", cvAnalysisSchema)
