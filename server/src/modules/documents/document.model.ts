import { Schema, model, models, type HydratedDocument, type Model } from "mongoose"

import {
  GENERATED_DOCUMENT_STATUSES,
  GENERATED_DOCUMENT_TYPES,
  type GeneratedDocumentShape,
} from "./document.types"

export type GeneratedDocumentDocument =
  HydratedDocument<GeneratedDocumentShape>

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

const generatedDocumentSchema = new Schema<GeneratedDocumentShape>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: GENERATED_DOCUMENT_TYPES,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: GENERATED_DOCUMENT_STATUSES,
      required: true,
    },
    cvId: {
      type: Schema.Types.ObjectId,
      ref: "Cv",
      index: true,
    },
    jobDescriptionId: {
      type: Schema.Types.ObjectId,
      ref: "JobDescription",
      index: true,
    },
    comparisonId: {
      type: Schema.Types.ObjectId,
      ref: "Comparison",
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    notes: {
      type: [String],
      required: true,
      default: [],
    },
    generatedAt: {
      type: Date,
      required: true,
      index: true,
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

generatedDocumentSchema.index({ userId: 1, type: 1, createdAt: -1 })
generatedDocumentSchema.index({ userId: 1, generatedAt: -1 })

export const GeneratedDocumentModel: Model<GeneratedDocumentShape> =
  (models.GeneratedDocument as Model<GeneratedDocumentShape> | undefined) ??
  model<GeneratedDocumentShape>(
    "GeneratedDocument",
    generatedDocumentSchema,
  )
