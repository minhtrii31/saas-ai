import type { Types } from "mongoose"

export type RefreshSessionDocumentShape = {
  _id: Types.ObjectId
  sessionId: string
  userId: Types.ObjectId
  tokenHash: string
  familyId: string
  expiresAt: Date
  revokedAt?: Date
  rotatedAt?: Date
  replacedBySessionId?: string
  userAgent?: string
  ipAddress?: string
  createdAt: Date
  updatedAt: Date
}
