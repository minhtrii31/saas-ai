import { Schema, model, models, type HydratedDocument, type Model } from "mongoose"

import type { RefreshSessionDocumentShape } from "./refresh-session.types"

export type RefreshSessionDocument =
  HydratedDocument<RefreshSessionDocumentShape>

const refreshSessionSchema = new Schema<RefreshSessionDocumentShape>(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
      select: false,
    },
    familyId: {
      type: String,
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    revokedAt: {
      type: Date,
    },
    rotatedAt: {
      type: Date,
    },
    replacedBySessionId: {
      type: String,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

refreshSessionSchema.index({ userId: 1, revokedAt: 1 })
refreshSessionSchema.index({ familyId: 1, revokedAt: 1 })

export const RefreshSessionModel: Model<RefreshSessionDocumentShape> =
  (models.RefreshSession as Model<RefreshSessionDocumentShape> | undefined) ??
  model<RefreshSessionDocumentShape>("RefreshSession", refreshSessionSchema)
