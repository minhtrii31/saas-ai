import { Schema, model, models, type HydratedDocument, type Model } from "mongoose"

import { USER_ROLES, type UserDocumentShape } from "./user.types"

export type UserDocument = HydratedDocument<UserDocumentShape>

const userSchema = new Schema<UserDocumentShape>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: USER_ROLES,
      default: "user",
      required: true,
    },
    name: {
      type: String,
      trim: true,
    },
    avatarUrl: {
      type: String,
      trim: true,
    },
    refreshTokenHash: {
      type: String,
      select: false,
    },
    refreshTokenExpiresAt: {
      type: Date,
      select: false,
    },
    passwordResetTokenHash: {
      type: String,
      select: false,
      index: true,
    },
    passwordResetTokenExpiresAt: {
      type: Date,
      select: false,
    },
    emailVerificationTokenHash: {
      type: String,
      select: false,
      index: true,
    },
    emailVerificationTokenExpiresAt: {
      type: Date,
      select: false,
    },
    emailVerifiedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    const user = ret as Record<string, unknown> & {
      _id?: { toString(): string }
    }
    const id = user._id?.toString()

    if (id) {
      user.id = id
    }

    delete user._id
    delete user.passwordHash
    delete user.refreshTokenHash
    delete user.refreshTokenExpiresAt
    delete user.passwordResetTokenHash
    delete user.passwordResetTokenExpiresAt
    delete user.emailVerificationTokenHash
    delete user.emailVerificationTokenExpiresAt
    return user
  },
})

export const UserModel: Model<UserDocumentShape> =
  (models.User as Model<UserDocumentShape> | undefined) ??
  model<UserDocumentShape>("User", userSchema)
