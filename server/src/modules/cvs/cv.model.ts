import { Schema, model, models, type HydratedDocument, type Model } from "mongoose"

import {
  CV_PARSER_STATUSES,
  CV_RETENTION_STATUSES,
  CV_STORAGE_PROVIDERS,
  CV_UPLOAD_STATUSES,
  type CvDocumentShape,
} from "./cv.types"

export type CvDocument = HydratedDocument<CvDocumentShape>

const parserMetadataSchema = new Schema(
  {
    parser: {
      type: String,
      enum: ["pdf-parse", "mammoth"],
      required: true,
    },
    pageCount: {
      type: Number,
      min: 1,
    },
    characterCount: {
      type: Number,
      min: 0,
      required: true,
    },
    warnings: {
      type: [String],
      default: undefined,
    },
  },
  {
    _id: false,
    versionKey: false,
  },
)

const cvSchema = new Schema<CvDocumentShape>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    originalFileName: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
      min: 1,
    },
    storageProvider: {
      type: String,
      enum: CV_STORAGE_PROVIDERS,
      required: true,
    },
    cloudinaryPublicId: {
      type: String,
      required: true,
      select: false,
    },
    cloudinarySecureUrl: {
      type: String,
      select: false,
    },
    uploadStatus: {
      type: String,
      enum: CV_UPLOAD_STATUSES,
      required: true,
    },
    parsedText: {
      type: String,
      select: false,
    },
    parserStatus: {
      type: String,
      enum: CV_PARSER_STATUSES,
      required: true,
      index: true,
    },
    parserError: {
      type: String,
    },
    parserMetadata: {
      type: parserMetadataSchema,
    },
    retentionStatus: {
      type: String,
      enum: CV_RETENTION_STATUSES,
      required: true,
    },
    storageDeletionAttemptedAt: {
      type: Date,
    },
    storageDeletionError: {
      type: String,
      select: false,
    },
    uploadedAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

cvSchema.index({ userId: 1, createdAt: -1 })

export const CvModel: Model<CvDocumentShape> =
  (models.Cv as Model<CvDocumentShape> | undefined) ??
  model<CvDocumentShape>("Cv", cvSchema)
