import type mongoose from "mongoose"

import {
  RefreshSessionModel,
  type RefreshSessionDocument,
} from "./refresh-session.model"
import type { RefreshSessionDocumentShape } from "./refresh-session.types"

export const createRefreshSession = async (
  session: Omit<RefreshSessionDocumentShape, "_id" | "createdAt" | "updatedAt">,
): Promise<RefreshSessionDocument> => {
  return RefreshSessionModel.create(session)
}

export const findRefreshSessionByTokenHash = async (
  tokenHash: string,
): Promise<RefreshSessionDocument | null> => {
  return RefreshSessionModel.findOne({ tokenHash }).select("+tokenHash").exec()
}

export const findRefreshSessionBySessionId = async (
  sessionId: string,
): Promise<RefreshSessionDocument | null> => {
  return RefreshSessionModel.findOne({ sessionId }).exec()
}

export const revokeRefreshSession = async ({
  sessionId,
  replacedBySessionId,
  rotatedAt,
  revokedAt,
}: {
  sessionId: string
  replacedBySessionId?: string
  rotatedAt?: Date
  revokedAt: Date
}): Promise<boolean> => {
  const update: mongoose.UpdateQuery<RefreshSessionDocumentShape> = {
    $set: {
      revokedAt,
      ...(rotatedAt ? { rotatedAt } : {}),
      ...(replacedBySessionId ? { replacedBySessionId } : {}),
    },
  }

  const result = await RefreshSessionModel.updateOne(
    { sessionId, revokedAt: { $exists: false } },
    update,
  ).exec()

  return result.modifiedCount === 1
}

export const revokeRefreshSessionFamily = async ({
  familyId,
  revokedAt,
}: {
  familyId: string
  revokedAt: Date
}): Promise<void> => {
  await RefreshSessionModel.updateMany(
    { familyId, revokedAt: { $exists: false } },
    { $set: { revokedAt } },
  ).exec()
}

export const revokeRefreshSessionsForUser = async ({
  userId,
  revokedAt,
}: {
  userId: string
  revokedAt: Date
}): Promise<void> => {
  await RefreshSessionModel.updateMany(
    { userId, revokedAt: { $exists: false } },
    { $set: { revokedAt } },
  ).exec()
}

export const deleteExpiredRefreshSessionsBefore = async ({
  cutoff,
}: {
  cutoff: Date
}): Promise<number> => {
  const result = await RefreshSessionModel.deleteMany({
    expiresAt: { $lte: cutoff },
  }).exec()

  return result.deletedCount
}

export const deleteRevokedRefreshSessionsBefore = async ({
  cutoff,
}: {
  cutoff: Date
}): Promise<number> => {
  const result = await RefreshSessionModel.deleteMany({
    revokedAt: { $lte: cutoff },
  }).exec()

  return result.deletedCount
}
