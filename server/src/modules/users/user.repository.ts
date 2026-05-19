import type mongoose from "mongoose"

import { UserModel, type UserDocument } from "./user.model"
import type { UserDocumentShape } from "./user.types"

export const createUser = async (
  user: Pick<UserDocumentShape, "email" | "passwordHash" | "role" | "name">,
): Promise<UserDocument> => {
  return UserModel.create(user)
}

export const findUserByEmailForAuth = async (
  email: string,
): Promise<UserDocument | null> => {
  return UserModel.findOne({ email })
    .select("+passwordHash +refreshTokenHash +refreshTokenExpiresAt")
    .exec()
}

export const findUserById = async (
  userId: string,
): Promise<UserDocument | null> => {
  return UserModel.findById(userId).exec()
}

export const findUserByIdForAuth = async (
  userId: string,
): Promise<UserDocument | null> => {
  return UserModel.findById(userId)
    .select("+passwordHash +refreshTokenHash +refreshTokenExpiresAt")
    .exec()
}

export const findUserByRefreshTokenHash = async (
  refreshTokenHash: string,
): Promise<UserDocument | null> => {
  return UserModel.findOne({ refreshTokenHash })
    .select("+refreshTokenHash +refreshTokenExpiresAt")
    .exec()
}

export const consumeLegacyRefreshToken = async ({
  userId,
  refreshTokenHash,
  now,
}: {
  userId: string
  refreshTokenHash: string
  now: Date
}): Promise<UserDocument | null> => {
  return UserModel.findOneAndUpdate(
    {
      _id: userId,
      refreshTokenHash,
      refreshTokenExpiresAt: { $gt: now },
    },
    {
      $unset: {
        refreshTokenHash: "",
        refreshTokenExpiresAt: "",
      },
    },
    { new: false },
  )
    .select("+refreshTokenHash +refreshTokenExpiresAt")
    .exec()
}

export const findUserByPasswordResetTokenHash = async (
  passwordResetTokenHash: string,
): Promise<UserDocument | null> => {
  return UserModel.findOne({ passwordResetTokenHash })
    .select("+passwordResetTokenHash +passwordResetTokenExpiresAt")
    .exec()
}

export const findUserByEmailVerificationTokenHash = async (
  emailVerificationTokenHash: string,
): Promise<UserDocument | null> => {
  return UserModel.findOne({ emailVerificationTokenHash })
    .select("+emailVerificationTokenHash +emailVerificationTokenExpiresAt")
    .exec()
}

export const updateUserById = async (
  userId: string,
  update: mongoose.UpdateQuery<UserDocumentShape>,
): Promise<UserDocument | null> => {
  return UserModel.findByIdAndUpdate(userId, update, { new: true }).exec()
}

export const clearUserRefreshToken = async (
  filter: Record<string, unknown>,
): Promise<void> => {
  await UserModel.updateOne(filter, {
    $unset: {
      refreshTokenHash: "",
      refreshTokenExpiresAt: "",
    },
  }).exec()
}

export const clearExpiredPasswordResetTokens = async ({
  now,
}: {
  now: Date
}): Promise<number> => {
  const result = await UserModel.updateMany(
    {
      passwordResetTokenExpiresAt: { $lte: now },
    },
    {
      $unset: {
        passwordResetTokenHash: "",
        passwordResetTokenExpiresAt: "",
      },
    },
  ).exec()

  return result.modifiedCount
}

export const clearExpiredEmailVerificationTokens = async ({
  now,
}: {
  now: Date
}): Promise<number> => {
  const result = await UserModel.updateMany(
    {
      emailVerificationTokenExpiresAt: { $lte: now },
    },
    {
      $unset: {
        emailVerificationTokenHash: "",
        emailVerificationTokenExpiresAt: "",
      },
    },
  ).exec()

  return result.modifiedCount
}
