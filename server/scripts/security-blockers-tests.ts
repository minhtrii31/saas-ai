import assert from "node:assert/strict"
import http from "node:http"
import { Types } from "mongoose"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

import { app } from "../src/app"
import { env } from "../src/config/env"
import { runAuthTokenCleanup } from "../src/modules/auth/auth-token-cleanup.service"
import { validateAccessTokenSession } from "../src/modules/auth/auth.middleware"
import { shouldIncludeIssuedTokenInResponse } from "../src/modules/auth/auth.routes"
import {
  changeUserPassword,
  loginUser,
  logoutUser,
  requestEmailVerification,
  requestPasswordReset,
  rotateRefreshToken,
} from "../src/modules/auth/auth.service"
import {
  ACCESS_TOKEN_ALGORITHM,
  type AccessTokenPayload,
  createRefreshToken,
  hashRefreshToken,
  signAccessToken,
  verifyAccessToken,
} from "../src/modules/auth/auth.tokens"
import { RefreshSessionModel } from "../src/modules/auth/refresh-session.model"
import { CvModel } from "../src/modules/cvs/cv.model"
import { toPublicCv } from "../src/modules/cvs/cv.presenter"
import { CV_RETENTION_STATUSES } from "../src/modules/cvs/cv.types"
import { deleteUserCv, uploadCvForUser } from "../src/modules/cvs/cv.service"
import { validateCvUploadFile } from "../src/modules/cvs/cv.validation"
import { CvAnalysisModel } from "../src/modules/analyses/analysis.model"
import { ComparisonModel } from "../src/modules/comparisons/comparison.model"
import {
  createComparisonSchema,
} from "../src/modules/comparisons/comparison.validation"
import { GeneratedDocumentModel } from "../src/modules/documents/document.model"
import {
  createCoverLetterSchema,
  updateGeneratedDocumentSchema,
} from "../src/modules/documents/document.validation"
import { JobDescriptionModel } from "../src/modules/jobs/job.model"
import {
  countJobDescriptionsForUser,
  listJobDescriptionsForUser,
} from "../src/modules/jobs/job.repository"
import {
  createJobDescriptionSchema,
  JOB_SEARCH_MAX_LENGTH,
  jobSearchSchema,
  updateJobDescriptionSchema,
} from "../src/modules/jobs/job.validation"
import { openApiDocument } from "../src/modules/openapi/openapi.document"
import { UserModel } from "../src/modules/users/user.model"
import { setEmailProviderForTesting } from "../src/services/email/email.service"
import type {
  EmailMessage,
  EmailProvider,
} from "../src/services/email/email-provider"
import {
  DOCX_MIME_TYPE,
  PDF_MIME_TYPE,
  setParseCvDocumentForTesting,
} from "../src/services/document-parser/document-parser"
import {
  createSignedCvAssetUrl,
  setCloudinaryStorageForTesting,
} from "../src/services/storage/cloudinary-storage"
import { AppError } from "../src/shared/errors"

const listen = async (): Promise<{
  baseUrl: string
  close: () => Promise<void>
}> => {
  const server = http.createServer(app)

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve)
  })

  const address = server.address()

  assert(address && typeof address === "object")

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error)
            return
          }

          resolve()
        })
      }),
  }
}

const createUploadFile = ({
  originalname,
  mimetype,
  buffer,
}: {
  originalname: string
  mimetype: string
  buffer: Buffer
}) => ({
  originalname,
  mimetype,
  size: buffer.length,
  buffer,
})

const expectAppErrorCode = (callback: () => void, code: string): void => {
  assert.throws(callback, (error) => {
    return Boolean(
      error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === code,
    )
  })
}

const isAppErrorCode = (error: unknown, code: string): boolean => {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === code,
  )
}

const createMockUser = (email = "known@example.com") => {
  const now = new Date()

  return {
    _id: new Types.ObjectId(),
    email,
    passwordHash: "hash",
    role: "user" as const,
    createdAt: now,
    updatedAt: now,
  }
}

const createMockCv = ({
  userId = new Types.ObjectId().toString(),
  cvId = new Types.ObjectId().toString(),
  publicId = "private/cv",
  retentionStatus = "retained_for_retry",
}: {
  userId?: string
  cvId?: string
  publicId?: string
  retentionStatus?: "retained_for_retry" | "storage_deletion_failed" | "ready_for_cleanup"
} = {}) => {
  const now = new Date()

  return {
    _id: new Types.ObjectId(cvId),
    userId: new Types.ObjectId(userId),
    title: "Resume",
    originalFileName: "resume.pdf",
    mimeType: PDF_MIME_TYPE,
    fileSize: 9,
    storageProvider: "cloudinary" as const,
    cloudinaryPublicId: publicId,
    uploadStatus: "uploaded" as const,
    parsedText: "Experienced engineer",
    parserStatus: "parsed" as const,
    parserMetadata: {
      parser: "pdf-parse" as const,
      pageCount: 1,
      characterCount: 20,
    },
    retentionStatus,
    uploadedAt: now,
    createdAt: now,
    updatedAt: now,
  }
}

const createQuery = <T>(result: T) => {
  return {
    select() {
      return this
    },
    exec: async () => result,
  }
}

const matchesUnsetRevokedFilter = (
  filter: { revokedAt?: { $exists?: boolean } },
  session: { revokedAt?: Date },
): boolean => {
  return filter.revokedAt?.$exists === false ? !session.revokedAt : true
}

const withMockedUsers = async (
  user: ReturnType<typeof createMockUser> | null,
  callback: (updates: unknown[]) => Promise<void>,
): Promise<void> => {
  const model = UserModel as unknown as {
    findOne: unknown
    findById: unknown
    findByIdAndUpdate: unknown
  }
  const originals = {
    findOne: model.findOne,
    findById: model.findById,
    findByIdAndUpdate: model.findByIdAndUpdate,
  }
  const updates: unknown[] = []

  model.findOne = (filter: { email?: string }) =>
    createQuery(filter.email === user?.email ? user : null)
  model.findById = (userId: string) =>
    createQuery(user && user._id.toString() === userId ? user : null)
  model.findByIdAndUpdate = (_userId: string, update: unknown) => {
    updates.push(update)
    return createQuery(user)
  }

  try {
    await callback(updates)
  } finally {
    model.findOne = originals.findOne
    model.findById = originals.findById
    model.findByIdAndUpdate = originals.findByIdAndUpdate
  }
}

const withMockedAuthPersistence = async (
  callback: (state: {
    user: ReturnType<typeof createMockUser> & {
      passwordHash: string
      refreshTokenHash?: string
      refreshTokenExpiresAt?: Date
    }
    sessions: Array<{
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
    }>
  }) => Promise<void>,
): Promise<void> => {
  const userModel = UserModel as unknown as {
    findOne: unknown
    findById: unknown
    findByIdAndUpdate: unknown
    findOneAndUpdate: unknown
    updateOne: unknown
  }
  const sessionModel = RefreshSessionModel as unknown as {
    create: unknown
    findOne: unknown
    updateOne: unknown
    updateMany: unknown
  }
  const originals = {
    userFindOne: userModel.findOne,
    userFindById: userModel.findById,
    userFindByIdAndUpdate: userModel.findByIdAndUpdate,
    userFindOneAndUpdate: userModel.findOneAndUpdate,
    userUpdateOne: userModel.updateOne,
    sessionCreate: sessionModel.create,
    sessionFindOne: sessionModel.findOne,
    sessionUpdateOne: sessionModel.updateOne,
    sessionUpdateMany: sessionModel.updateMany,
  }
  const now = new Date()
  const user = {
    ...createMockUser("session@example.com"),
    passwordHash: await bcrypt.hash("OldPass123", 4),
    createdAt: now,
    updatedAt: now,
  }
  const sessions: Array<{
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
  }> = []

  userModel.findOne = (filter: { email?: string; refreshTokenHash?: string }) =>
    createQuery(
      (filter.email && filter.email === user.email) ||
        (filter.refreshTokenHash &&
          filter.refreshTokenHash === user.refreshTokenHash)
        ? user
        : null,
    )
  userModel.findById = (userId: string) =>
    createQuery(user._id.toString() === userId ? user : null)
  userModel.findByIdAndUpdate = (_userId: string, update: {
    $set?: Record<string, unknown>
    $unset?: Record<string, unknown>
  }) => {
    Object.assign(user, update.$set ?? {})
    for (const key of Object.keys(update.$unset ?? {})) {
      delete (user as unknown as Record<string, unknown>)[key]
    }

    return createQuery(user)
  }
  userModel.findOneAndUpdate = (
    filter: {
      _id?: string
      refreshTokenHash?: string
      refreshTokenExpiresAt?: { $gt?: Date }
    },
    update: { $unset?: Record<string, unknown> },
  ) => {
    const matchesUser = !filter._id || filter._id === user._id.toString()
    const matchesHash =
      !filter.refreshTokenHash || filter.refreshTokenHash === user.refreshTokenHash
    const matchesExpiry =
      !filter.refreshTokenExpiresAt?.$gt ||
      Boolean(
        user.refreshTokenExpiresAt &&
          user.refreshTokenExpiresAt > filter.refreshTokenExpiresAt.$gt,
      )
    const matched = matchesUser && matchesHash && matchesExpiry
    const result = matched ? { ...user } : null

    if (matched) {
      for (const key of Object.keys(update.$unset ?? {})) {
        delete (user as unknown as Record<string, unknown>)[key]
      }
    }

    return createQuery(result)
  }
  userModel.updateOne = (filter: { _id?: string; refreshTokenHash?: string }, update: {
    $unset?: Record<string, unknown>
  }) => {
    if (
      (filter._id && filter._id === user._id.toString()) ||
      (filter.refreshTokenHash && filter.refreshTokenHash === user.refreshTokenHash)
    ) {
      for (const key of Object.keys(update.$unset ?? {})) {
        delete (user as unknown as Record<string, unknown>)[key]
      }
    }

    return createQuery({ modifiedCount: 1 })
  }
  sessionModel.create = async (session: (typeof sessions)[number]) => {
    const created = {
      ...session,
      _id: new Types.ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    sessions.push(created)

    return created
  }
  sessionModel.findOne = (filter: { tokenHash?: string }) =>
    createQuery(
      sessions.find(
        (session) =>
          (filter.tokenHash && session.tokenHash === filter.tokenHash) ||
          ("sessionId" in filter && session.sessionId === filter.sessionId),
      ) ?? null,
    )
  sessionModel.updateOne = (
    filter: { sessionId?: string; revokedAt?: { $exists?: boolean } },
    update: { $set?: Partial<(typeof sessions)[number]> },
  ) => {
    const session = sessions.find(
      (candidate) =>
        candidate.sessionId === filter.sessionId &&
        matchesUnsetRevokedFilter(filter, candidate),
    )

    if (session) {
      Object.assign(session, update.$set ?? {}, { updatedAt: new Date() })
    }

    return createQuery({ modifiedCount: session ? 1 : 0 })
  }
  sessionModel.updateMany = (
    filter: {
      familyId?: string
      userId?: string
      revokedAt?: { $exists?: boolean }
    },
    update: { $set?: Partial<(typeof sessions)[number]> },
  ) => {
    let modifiedCount = 0

    for (const session of sessions) {
      const matchesFamily = !filter.familyId || session.familyId === filter.familyId
      const matchesUser =
        !filter.userId || session.userId.toString() === filter.userId

      if (
        matchesFamily &&
        matchesUser &&
        matchesUnsetRevokedFilter(filter, session)
      ) {
        Object.assign(session, update.$set ?? {}, { updatedAt: new Date() })
        modifiedCount += 1
      }
    }

    return createQuery({ modifiedCount })
  }

  try {
    await callback({ user, sessions })
  } finally {
    userModel.findOne = originals.userFindOne
    userModel.findById = originals.userFindById
    userModel.findByIdAndUpdate = originals.userFindByIdAndUpdate
    userModel.findOneAndUpdate = originals.userFindOneAndUpdate
    userModel.updateOne = originals.userUpdateOne
    sessionModel.create = originals.sessionCreate
    sessionModel.findOne = originals.sessionFindOne
    sessionModel.updateOne = originals.sessionUpdateOne
    sessionModel.updateMany = originals.sessionUpdateMany
  }
}

const withMockedAuthTokenCleanupPersistence = async (
  callback: (state: {
    users: Array<ReturnType<typeof createMockUser> & {
      passwordResetTokenHash?: string
      passwordResetTokenExpiresAt?: Date
      emailVerificationTokenHash?: string
      emailVerificationTokenExpiresAt?: Date
    }>
    refreshSessions: Array<{
      sessionId: string
      expiresAt: Date
      revokedAt?: Date
    }>
    deletedUserCount: number
  }) => Promise<void>,
): Promise<void> => {
  const userModel = UserModel as unknown as {
    updateMany: unknown
    deleteMany?: unknown
  }
  const sessionModel = RefreshSessionModel as unknown as {
    deleteMany: unknown
  }
  const originals = {
    userUpdateMany: userModel.updateMany,
    userDeleteMany: userModel.deleteMany,
    sessionDeleteMany: sessionModel.deleteMany,
  }
  const now = new Date("2026-05-16T00:00:00.000Z")
  const users = [
    {
      ...createMockUser("expired-reset@example.com"),
      passwordResetTokenHash: "expired-reset",
      passwordResetTokenExpiresAt: new Date(now.getTime() - 1000),
    },
    {
      ...createMockUser("valid-reset@example.com"),
      passwordResetTokenHash: "valid-reset",
      passwordResetTokenExpiresAt: new Date(now.getTime() + 1000),
    },
    {
      ...createMockUser("expired-verification@example.com"),
      emailVerificationTokenHash: "expired-verification",
      emailVerificationTokenExpiresAt: new Date(now.getTime() - 1000),
    },
    {
      ...createMockUser("valid-verification@example.com"),
      emailVerificationTokenHash: "valid-verification",
      emailVerificationTokenExpiresAt: new Date(now.getTime() + 1000),
    },
  ]
  const refreshSessions = [
    {
      sessionId: "expired-old",
      expiresAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
    },
    {
      sessionId: "expired-recent",
      expiresAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
    },
    {
      sessionId: "revoked-old",
      expiresAt: new Date(now.getTime() + 1000),
      revokedAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
    },
    {
      sessionId: "revoked-recent",
      expiresAt: new Date(now.getTime() + 1000),
      revokedAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
    },
    {
      sessionId: "active",
      expiresAt: new Date(now.getTime() + 1000),
    },
  ]
  let deletedUserCount = 0

  userModel.updateMany = (
    filter: {
      passwordResetTokenExpiresAt?: { $lte?: Date }
      emailVerificationTokenExpiresAt?: { $lte?: Date }
    },
    update: { $unset?: Record<string, unknown> },
  ) => {
    let modifiedCount = 0

    for (const user of users) {
      const matchesReset =
        Boolean(filter.passwordResetTokenExpiresAt?.$lte) &&
        Boolean(user.passwordResetTokenExpiresAt) &&
        user.passwordResetTokenExpiresAt! <= filter.passwordResetTokenExpiresAt!.$lte!
      const matchesVerification =
        Boolean(filter.emailVerificationTokenExpiresAt?.$lte) &&
        Boolean(user.emailVerificationTokenExpiresAt) &&
        user.emailVerificationTokenExpiresAt! <=
          filter.emailVerificationTokenExpiresAt!.$lte!

      if (matchesReset || matchesVerification) {
        for (const key of Object.keys(update.$unset ?? {})) {
          delete (user as unknown as Record<string, unknown>)[key]
        }
        modifiedCount += 1
      }
    }

    return createQuery({ modifiedCount })
  }
  userModel.deleteMany = () => {
    deletedUserCount += users.length
    return createQuery({ deletedCount: users.length })
  }
  sessionModel.deleteMany = (filter: {
    expiresAt?: { $lte?: Date }
    revokedAt?: { $lte?: Date }
  }) => {
    let deletedCount = 0

    for (let index = refreshSessions.length - 1; index >= 0; index--) {
      const session = refreshSessions[index]
      const matchesExpired = Boolean(
        filter.expiresAt?.$lte && session.expiresAt <= filter.expiresAt.$lte,
      )
      const matchesRevoked = Boolean(
        filter.revokedAt?.$lte &&
          session.revokedAt &&
          session.revokedAt <= filter.revokedAt.$lte,
      )

      if (matchesExpired || matchesRevoked) {
        refreshSessions.splice(index, 1)
        deletedCount += 1
      }
    }

    return createQuery({ deletedCount })
  }

  try {
    await callback({
      users,
      refreshSessions,
      get deletedUserCount() {
        return deletedUserCount
      },
    })
  } finally {
    userModel.updateMany = originals.userUpdateMany
    userModel.deleteMany = originals.userDeleteMany
    sessionModel.deleteMany = originals.sessionDeleteMany
  }
}

const withMockedCvPersistence = async (
  options: {
    initialCv?: ReturnType<typeof createMockCv> | null
    createShouldFail?: boolean
    failDeleteStep?: "documents" | "comparisons" | "analyses" | "cv"
  },
  callback: (state: {
    cvs: Array<ReturnType<typeof createMockCv>>
    deletedDocumentsCalls: number
    deletedComparisonsCalls: number
    deletedAnalysesCalls: number
    storageFailureMarks: unknown[]
    cvDeleteCalls: number
  }) => Promise<void>,
): Promise<void> => {
  const cvModel = CvModel as unknown as {
    create: unknown
    findOne: unknown
    findOneAndDelete: unknown
    findByIdAndUpdate: unknown
  }
  const documentModel = GeneratedDocumentModel as unknown as { deleteMany: unknown }
  const comparisonModel = ComparisonModel as unknown as { deleteMany: unknown }
  const analysisModel = CvAnalysisModel as unknown as { deleteMany: unknown }
  const originals = {
    cvCreate: cvModel.create,
    cvFindOne: cvModel.findOne,
    cvFindOneAndDelete: cvModel.findOneAndDelete,
    cvFindByIdAndUpdate: cvModel.findByIdAndUpdate,
    documentDeleteMany: documentModel.deleteMany,
    comparisonDeleteMany: comparisonModel.deleteMany,
    analysisDeleteMany: analysisModel.deleteMany,
  }
  const cvs =
    options.initialCv === undefined
      ? []
      : options.initialCv === null
        ? []
        : [options.initialCv]
  const storageFailureMarks: unknown[] = []
  let deletedDocumentsCalls = 0
  let deletedComparisonsCalls = 0
  let deletedAnalysesCalls = 0
  let cvDeleteCalls = 0
  let failedDeleteStep = false

  cvModel.create = async (cv: ReturnType<typeof createMockCv>) => {
    if (options.createShouldFail) {
      throw new Error("database unavailable")
    }

    const created = {
      ...cv,
      _id: new Types.ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as ReturnType<typeof createMockCv>
    cvs.push(created)

    return created
  }
  cvModel.findOne = (filter: { _id?: string; userId?: string }) =>
    createQuery(
      cvs.find(
        (cv) =>
          cv._id.toString() === filter._id &&
          cv.userId.toString() === filter.userId,
      ) ?? null,
    )
  cvModel.findOneAndDelete = (filter: { _id?: string; userId?: string }) => {
    cvDeleteCalls += 1

    if (options.failDeleteStep === "cv" && !failedDeleteStep) {
      failedDeleteStep = true
      throw new Error("cv delete failed")
    }

    const index = cvs.findIndex(
      (cv) =>
        cv._id.toString() === filter._id &&
        cv.userId.toString() === filter.userId,
    )
    const deleted = index >= 0 ? cvs.splice(index, 1)[0] : null

    return createQuery(deleted ?? null)
  }
  cvModel.findByIdAndUpdate = (cvId: string, update: unknown) => {
    storageFailureMarks.push({ cvId, update })
    return createQuery(null)
  }

  documentModel.deleteMany = () => {
    deletedDocumentsCalls += 1

    if (options.failDeleteStep === "documents" && !failedDeleteStep) {
      failedDeleteStep = true
      throw new Error("document delete failed")
    }

    return createQuery({ deletedCount: 1 })
  }
  comparisonModel.deleteMany = () => {
    deletedComparisonsCalls += 1

    if (options.failDeleteStep === "comparisons" && !failedDeleteStep) {
      failedDeleteStep = true
      throw new Error("comparison delete failed")
    }

    return createQuery({ deletedCount: 1 })
  }
  analysisModel.deleteMany = () => {
    deletedAnalysesCalls += 1

    if (options.failDeleteStep === "analyses" && !failedDeleteStep) {
      failedDeleteStep = true
      throw new Error("analysis delete failed")
    }

    return createQuery({ deletedCount: 1 })
  }

  try {
    await callback({
      cvs,
      get deletedDocumentsCalls() {
        return deletedDocumentsCalls
      },
      get deletedComparisonsCalls() {
        return deletedComparisonsCalls
      },
      get deletedAnalysesCalls() {
        return deletedAnalysesCalls
      },
      storageFailureMarks,
      get cvDeleteCalls() {
        return cvDeleteCalls
      },
    })
  } finally {
    cvModel.create = originals.cvCreate
    cvModel.findOne = originals.cvFindOne
    cvModel.findOneAndDelete = originals.cvFindOneAndDelete
    cvModel.findByIdAndUpdate = originals.cvFindByIdAndUpdate
    documentModel.deleteMany = originals.documentDeleteMany
    comparisonModel.deleteMany = originals.comparisonDeleteMany
    analysisModel.deleteMany = originals.analysisDeleteMany
  }
}

class RecordingEmailProvider implements EmailProvider {
  public readonly messages: EmailMessage[] = []

  constructor(private readonly fail = false) {}

  async send(message: EmailMessage): Promise<void> {
    if (this.fail) {
      throw new Error("provider unavailable")
    }

    this.messages.push(message)
  }
}

const expectZodValidationFailure = (callback: () => void): void => {
  assert.throws(callback, (error) => {
    return Boolean(
      error &&
        typeof error === "object" &&
        "issues" in error &&
        Array.isArray(error.issues),
    )
  })
}

const withMockedJobDescriptionQueries = async (
  callback: (filters: unknown[]) => Promise<void>,
): Promise<void> => {
  const model = JobDescriptionModel as unknown as {
    countDocuments: unknown
    find: unknown
  }
  const originals = {
    countDocuments: model.countDocuments,
    find: model.find,
  }
  const filters: unknown[] = []

  model.countDocuments = (filter: unknown) => {
    filters.push(filter)

    return { exec: async () => 0 }
  }
  model.find = (filter: unknown) => {
    filters.push(filter)

    return {
      sort() {
        return this
      },
      skip() {
        return this
      },
      limit() {
        return this
      },
      exec: async () => [],
    }
  }

  try {
    await callback(filters)
  } finally {
    model.countDocuments = originals.countDocuments
    model.find = originals.find
  }
}

const run = async (): Promise<void> => {
  const server = await listen()

  try {
    const localhost3001PreflightResponse = await fetch(
      `${server.baseUrl}/api/auth/refresh`,
      {
        method: "OPTIONS",
        headers: {
          origin: "http://localhost:3001",
          "access-control-request-method": "POST",
        },
      },
    )

    assert.equal(localhost3001PreflightResponse.status, 204)
    assert.equal(
      localhost3001PreflightResponse.headers.get("access-control-allow-origin"),
      "http://localhost:3001",
    )
    assert.equal(
      localhost3001PreflightResponse.headers.get(
        "access-control-allow-credentials",
      ),
      "true",
    )

    const hostileOriginResponse = await fetch(`${server.baseUrl}/api/auth/refresh`, {
      method: "POST",
      headers: {
        origin: "https://attacker.example",
      },
    })
    const hostileOriginBody = await hostileOriginResponse.json()

    assert.equal(hostileOriginResponse.status, 403)
    assert.equal(hostileOriginBody.error.code, "UNTRUSTED_ORIGIN")
    assert.ok(hostileOriginBody.meta.requestId)

    const invalidRequestIdResponse = await fetch(
      `${server.baseUrl}/missing?token=secret`,
      {
        headers: {
          "x-request-id": `${"x".repeat(80)} invalid`,
        },
      },
    )
    const invalidRequestIdBody = await invalidRequestIdResponse.json()

    assert.equal(invalidRequestIdResponse.status, 404)
    assert.match(
      invalidRequestIdResponse.headers.get("x-request-id") ?? "",
      /^[0-9a-f-]{36}$/,
    )
    assert.equal(invalidRequestIdBody.error.code, "NOT_FOUND")
    assert.ok(!invalidRequestIdBody.error.message.includes("token=secret"))

    const validRequestIdResponse = await fetch(`${server.baseUrl}/missing`, {
      headers: {
        "x-request-id": "trace_123:abc-DEF.456",
      },
    })

    assert.equal(
      validRequestIdResponse.headers.get("x-request-id"),
      "trace_123:abc-DEF.456",
    )

    const openApiResponse = await fetch(
      `${server.baseUrl}/api/docs/openapi.json`,
    )
    const openApiBody = await openApiResponse.json()

    assert.equal(openApiResponse.status, 200)
    assert.equal(openApiBody.data.openapi.openapi, "3.1.0")
    assert.ok(openApiBody.data.openapi.components.schemas.ApiError)
    assert.ok(openApiBody.data.openapi.components.schemas.Pagination)
    assert.ok(openApiBody.data.openapi.paths["/api/auth/login"].post.requestBody)
    assert.ok(openApiBody.data.openapi.paths["/api/cvs"].get.security)
    assert.ok(openApiBody.data.openapi.paths["/api/jobs"].get.parameters)
    assert.ok(openApiBody.data.openapi.paths["/api/comparisons"].post.requestBody)
    assert.ok(openApiBody.data.openapi.paths["/api/documents/{documentId}"].patch.requestBody)
  } finally {
    await server.close()
  }

  assert.equal(openApiDocument.paths["/health"].get.tags[0], "Health")

  createJobDescriptionSchema.parse({
    title: "Engineer",
    company: "Acme",
    descriptionText: "Build systems",
    sourceUrl: "https://example.test/job",
  })
  updateJobDescriptionSchema.parse({
    title: "Senior Engineer",
    descriptionText: "Build larger systems",
  })
  createComparisonSchema.parse({
    cvId: new Types.ObjectId().toString(),
    jobDescriptionId: new Types.ObjectId().toString(),
  })
  createCoverLetterSchema.parse({
    cvId: new Types.ObjectId().toString(),
    jobDescriptionId: new Types.ObjectId().toString(),
  })
  updateGeneratedDocumentSchema.parse({
    title: "Cover Letter",
    body: "A".repeat(80),
  })

  expectZodValidationFailure(() =>
    createJobDescriptionSchema.parse({
      title: "Engineer",
      descriptionText: "Build systems",
      ignored: true,
    }),
  )
  expectZodValidationFailure(() =>
    updateJobDescriptionSchema.parse({
      title: "Engineer",
      ignored: true,
    }),
  )
  expectZodValidationFailure(() =>
    createComparisonSchema.parse({
      cvId: new Types.ObjectId().toString(),
      jobDescriptionId: new Types.ObjectId().toString(),
      ignored: true,
    }),
  )
  expectZodValidationFailure(() =>
    createCoverLetterSchema.parse({
      cvId: new Types.ObjectId().toString(),
      jobDescriptionId: new Types.ObjectId().toString(),
      ignored: true,
    }),
  )
  expectZodValidationFailure(() =>
    updateGeneratedDocumentSchema.parse({
      body: "A".repeat(80),
      ignored: true,
    }),
  )

  assert.equal(jobSearchSchema.parse(" Engineer "), "Engineer")
  assert.equal(jobSearchSchema.parse(" ".repeat(4)), undefined)
  expectZodValidationFailure(() =>
    jobSearchSchema.parse("x".repeat(JOB_SEARCH_MAX_LENGTH + 1)),
  )

  await withMockedJobDescriptionQueries(async (filters) => {
    await countJobDescriptionsForUser({
      userId: new Types.ObjectId().toString(),
      search: "Engineer",
    })
    await countJobDescriptionsForUser({
      userId: new Types.ObjectId().toString(),
      search: ".*",
    })
    await listJobDescriptionsForUser({
      userId: new Types.ObjectId().toString(),
      search: "^(a+)+$",
      skip: 0,
      limit: 10,
      sortBy: "createdAt",
      sortOrder: "desc",
    })

    const normalFilter = filters[0] as {
      $or?: Array<{ title?: { $regex: string; $options: string } }>
    }
    const literalWildcardFilter = filters[1] as {
      $or?: Array<{ title?: { $regex: string; $options: string } }>
    }
    const pathologicalFilter = filters[2] as {
      $or?: Array<{ title?: { $regex: string; $options: string } }>
    }

    assert.equal(normalFilter.$or?.[0]?.title?.$regex, "Engineer")
    assert.equal(normalFilter.$or?.[0]?.title?.$options, "i")
    assert.equal(literalWildcardFilter.$or?.[0]?.title?.$regex, "\\.\\*")
    assert.equal(
      pathologicalFilter.$or?.[0]?.title?.$regex,
      "\\^\\(a\\+\\)\\+\\$",
    )
  })

  assert.deepEqual(CV_RETENTION_STATUSES, [
    "retained_for_retry",
    "storage_deletion_failed",
    "ready_for_cleanup",
  ])
  assert.equal(
    toPublicCv(createMockCv({ retentionStatus: "ready_for_cleanup" }))
      .retentionStatus,
    "ready_for_cleanup",
  )

  validateCvUploadFile(
    createUploadFile({
      originalname: "resume.pdf",
      mimetype: PDF_MIME_TYPE,
      buffer: Buffer.from("%PDF-1.7\n"),
    }),
  )
  validateCvUploadFile(
    createUploadFile({
      originalname: "resume.docx",
      mimetype: DOCX_MIME_TYPE,
      buffer: Buffer.from("PK\u0003\u0004 [Content_Types].xml word/document.xml"),
    }),
  )

  expectAppErrorCode(
    () =>
      validateCvUploadFile(
        createUploadFile({
          originalname: "resume.pdf",
          mimetype: PDF_MIME_TYPE,
          buffer: Buffer.from("not a pdf"),
        }),
      ),
    "UNSUPPORTED_CV_FILE_TYPE",
  )
  expectAppErrorCode(
    () =>
      validateCvUploadFile(
        createUploadFile({
          originalname: "resume.docx",
          mimetype: DOCX_MIME_TYPE,
          buffer: Buffer.from("not a zip"),
        }),
      ),
    "UNSUPPORTED_CV_FILE_TYPE",
  )
  expectAppErrorCode(
    () =>
      validateCvUploadFile(
        createUploadFile({
          originalname: "resume.pdf",
          mimetype: DOCX_MIME_TYPE,
          buffer: Buffer.from("PK\u0003\u0004 [Content_Types].xml word/document.xml"),
        }),
      ),
    "UNSUPPORTED_CV_FILE_TYPE",
  )

  const uploadUserId = new Types.ObjectId().toString()
  const validPdfUpload = createUploadFile({
    originalname: "resume.pdf",
    mimetype: PDF_MIME_TYPE,
    buffer: Buffer.from("%PDF-1.7\n"),
  }) as Express.Multer.File

  setParseCvDocumentForTesting(async () => {
    throw new Error("parser exploded")
  })
  setCloudinaryStorageForTesting({
    upload: async () => {
      throw new Error("upload should not run after parser failure")
    },
  })
  await withMockedCvPersistence({}, async (state) => {
    await assert.rejects(
      () => uploadCvForUser({ userId: uploadUserId, file: validPdfUpload }),
      (error) => isAppErrorCode(error, "CV_PARSING_FAILED"),
    )
    assert.equal(state.cvs.length, 0)
  })

  setParseCvDocumentForTesting(async () => ({
    text: "valid parsed text",
    metadata: {
      parser: "pdf-parse",
      pageCount: env.CV_MAX_PAGE_COUNT + 1,
      characterCount: 17,
    },
  }))
  await withMockedCvPersistence({}, async (state) => {
    await assert.rejects(
      () => uploadCvForUser({ userId: uploadUserId, file: validPdfUpload }),
      (error) => isAppErrorCode(error, "CV_PAGE_LIMIT_EXCEEDED"),
    )
    assert.equal(state.cvs.length, 0)
  })

  let uploadedPublicId: string | undefined
  let cleanedPublicId: string | undefined
  setParseCvDocumentForTesting(async () => ({
    text: "valid parsed text",
    metadata: {
      parser: "pdf-parse",
      pageCount: 1,
      characterCount: 17,
    },
  }))
  setCloudinaryStorageForTesting({
    upload: async () => {
      uploadedPublicId = "private/uploaded-cv"
      return {
        provider: "cloudinary",
        publicId: uploadedPublicId,
      }
    },
    delete: async ({ publicId }) => {
      cleanedPublicId = publicId
    },
  })
  await withMockedCvPersistence({ createShouldFail: true }, async (state) => {
    await assert.rejects(
      () => uploadCvForUser({ userId: uploadUserId, file: validPdfUpload }),
      /database unavailable/,
    )
    assert.equal(state.cvs.length, 0)
    assert.equal(cleanedPublicId, uploadedPublicId)
  })

  let cleanupFailureDeleteCalls = 0
  setCloudinaryStorageForTesting({
    upload: async () => ({
      provider: "cloudinary",
      publicId: "private/uploaded-cv",
    }),
    delete: async () => {
      cleanupFailureDeleteCalls += 1
      throw new AppError({
        code: "UPLOAD_STORAGE_DELETE_FAILED",
        message: "delete failed",
        statusCode: 502,
      })
    },
  })
  await withMockedCvPersistence({ createShouldFail: true }, async (state) => {
    await assert.rejects(
      () => uploadCvForUser({ userId: uploadUserId, file: validPdfUpload }),
      /database unavailable/,
    )
    assert.equal(state.cvs.length, 0)
    assert.equal(cleanupFailureDeleteCalls, 1)
  })

  setParseCvDocumentForTesting(undefined)
  setCloudinaryStorageForTesting(undefined)

  const publicCv = toPublicCv({
    ...createMockCv({ userId: uploadUserId }),
    cloudinarySecureUrl: "https://res.cloudinary.com/demo/raw/upload/private/cv.pdf",
  })
  assert.ok(!("cloudinarySecureUrl" in publicCv))
  assert.ok(JSON.stringify(publicCv).includes("res.cloudinary.com") === false)

  setCloudinaryStorageForTesting({
    signedUrl: ({ publicId, expiresAt }) =>
      `https://signed.example/${encodeURIComponent(
        publicId,
      )}?expires=${expiresAt.getTime()}`,
  })
  assert.match(
    createSignedCvAssetUrl({
      publicId: "private/uploaded-cv",
      expiresAt: new Date("2026-05-16T00:05:00.000Z"),
    }),
    /^https:\/\/signed\.example\/private%2Fuploaded-cv\?expires=/,
  )
  setCloudinaryStorageForTesting(undefined)

  const deleteUserId = new Types.ObjectId().toString()
  const deleteCvId = new Types.ObjectId().toString()
  const deleteCv = createMockCv({ userId: deleteUserId, cvId: deleteCvId })
  let deleteStorageCalls = 0
  setCloudinaryStorageForTesting({
    delete: async () => {
      deleteStorageCalls += 1
    },
  })
  await withMockedCvPersistence(
    { initialCv: deleteCv, failDeleteStep: "comparisons" },
    async (state) => {
      await assert.rejects(
        () => deleteUserCv({ userId: deleteUserId, cvId: deleteCvId }),
        /comparison delete failed/,
      )
      assert.equal(state.cvs.length, 1)
      assert.equal(deleteStorageCalls, 0)

      await deleteUserCv({ userId: deleteUserId, cvId: deleteCvId })

      assert.equal(state.cvs.length, 0)
      assert.equal(state.deletedDocumentsCalls, 2)
      assert.equal(state.deletedComparisonsCalls, 2)
      assert.equal(state.deletedAnalysesCalls, 1)
      assert.equal(deleteStorageCalls, 1)
    },
  )

  const duplicateDeleteUserId = new Types.ObjectId().toString()
  const duplicateDeleteCvId = new Types.ObjectId().toString()
  await withMockedCvPersistence(
    {
      initialCv: createMockCv({
        userId: duplicateDeleteUserId,
        cvId: duplicateDeleteCvId,
      }),
    },
    async (state) => {
      await deleteUserCv({
        userId: duplicateDeleteUserId,
        cvId: duplicateDeleteCvId,
      })
      await assert.rejects(
        () =>
          deleteUserCv({
            userId: duplicateDeleteUserId,
            cvId: duplicateDeleteCvId,
          }),
        (error) => isAppErrorCode(error, "CV_NOT_FOUND"),
      )
      assert.equal(state.cvDeleteCalls, 1)
    },
  )

  let failingStorageDeleteCalls = 0
  setCloudinaryStorageForTesting({
    delete: async () => {
      failingStorageDeleteCalls += 1
      throw new AppError({
        code: "UPLOAD_STORAGE_DELETE_FAILED",
        message: "delete failed",
        statusCode: 502,
      })
    },
  })
  await withMockedCvPersistence(
    {
      initialCv: createMockCv({
        userId: deleteUserId,
        cvId: deleteCvId,
      }),
    },
    async (state) => {
      await assert.rejects(
        () => deleteUserCv({ userId: deleteUserId, cvId: deleteCvId }),
        (error) => isAppErrorCode(error, "CV_STORAGE_DELETE_FAILED"),
      )
      assert.equal(failingStorageDeleteCalls, 1)
      assert.equal(state.cvs.length, 1)
      assert.equal(state.storageFailureMarks.length, 1)
    },
  )
  setCloudinaryStorageForTesting(undefined)

  assert.equal(
    shouldIncludeIssuedTokenInResponse({
      nodeEnv: "production",
      token: "raw-token",
    }),
    false,
  )
  assert.equal(
    shouldIncludeIssuedTokenInResponse({
      nodeEnv: "test",
      token: "raw-token",
    }),
    true,
  )

  const baseJwtPayload: AccessTokenPayload = {
    sub: new Types.ObjectId().toString(),
    role: "user",
    sessionId: "session-claims",
  }
  const signRawAccessToken = (options: jwt.SignOptions = {}) =>
    jwt.sign(baseJwtPayload, env.ACCESS_TOKEN_SECRET, {
      algorithm: ACCESS_TOKEN_ALGORITHM,
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      expiresIn: "15m",
      ...options,
    })

  const validAccessToken = signAccessToken(baseJwtPayload)
  const validPayload = verifyAccessToken(validAccessToken)

  assert.equal(validPayload.sub, baseJwtPayload.sub)
  assert.equal(validPayload.role, baseJwtPayload.role)
  assert.equal(validPayload.sessionId, baseJwtPayload.sessionId)
  assert.throws(() =>
    verifyAccessToken(
      signRawAccessToken({
        issuer: "wrong-issuer",
      }),
    ),
  )
  assert.throws(() =>
    verifyAccessToken(
      signRawAccessToken({
        audience: "wrong-audience",
      }),
    ),
  )
  assert.throws(() =>
    verifyAccessToken(
      jwt.sign(baseJwtPayload, env.ACCESS_TOKEN_SECRET, {
        algorithm: "HS384",
        issuer: env.JWT_ISSUER,
        audience: env.JWT_AUDIENCE,
        expiresIn: "15m",
      }),
    ),
  )
  assert.throws(() =>
    verifyAccessToken(
      signRawAccessToken({
        expiresIn: "-1s",
      }),
    ),
  )
  assert.equal(
    verifyAccessToken(
      jwt.sign(baseJwtPayload, env.ACCESS_TOKEN_SECRET, {
        algorithm: ACCESS_TOKEN_ALGORITHM,
        expiresIn: "15m",
      }),
    ).sessionId,
    baseJwtPayload.sessionId,
  )

  const previousForceDelivery = process.env.FORCE_ACCOUNT_EMAIL_DELIVERY
  process.env.FORCE_ACCOUNT_EMAIL_DELIVERY = "true"

  try {
    const knownUser = createMockUser()
    const resetProvider = new RecordingEmailProvider()
    setEmailProviderForTesting(resetProvider)

    await withMockedUsers(knownUser, async (updates) => {
      const result = await requestPasswordReset({ email: knownUser.email })

      assert.equal(result.accepted, true)
      assert.ok(result.token)
      assert.equal(updates.length, 1)
      assert.equal(resetProvider.messages.length, 1)
      assert.equal(resetProvider.messages[0]?.to, knownUser.email)
      assert.match(
        resetProvider.messages[0]?.text ?? "",
        /\/forgot-password\?token=/,
      )
    })

    const unknownProvider = new RecordingEmailProvider()
    setEmailProviderForTesting(unknownProvider)

    await withMockedUsers(null, async (updates) => {
      const result = await requestPasswordReset({ email: "unknown@example.com" })

      assert.deepEqual(result, { accepted: true })
      assert.equal(updates.length, 0)
      assert.equal(unknownProvider.messages.length, 0)
    })

    const verificationProvider = new RecordingEmailProvider()
    setEmailProviderForTesting(verificationProvider)

    await withMockedUsers(knownUser, async (updates) => {
      const result = await requestEmailVerification(knownUser._id.toString())

      assert.equal(result.accepted, true)
      assert.ok(result.token)
      assert.equal(updates.length, 1)
      assert.equal(verificationProvider.messages.length, 1)
      assert.equal(verificationProvider.messages[0]?.to, knownUser.email)
      assert.match(
        verificationProvider.messages[0]?.text ?? "",
        /\/dashboard\?verificationToken=/,
      )
    })

    const failingResetProvider = new RecordingEmailProvider(true)
    setEmailProviderForTesting(failingResetProvider)

    await withMockedUsers(knownUser, async () => {
      const result = await requestPasswordReset({ email: knownUser.email })

      assert.equal(result.accepted, true)
      assert.ok(result.token)
    })

    const failingVerificationProvider = new RecordingEmailProvider(true)
    setEmailProviderForTesting(failingVerificationProvider)

    await withMockedUsers(knownUser, async () => {
      await assert.rejects(
        () => requestEmailVerification(knownUser._id.toString()),
        (error) => isAppErrorCode(error, "EMAIL_DELIVERY_FAILED"),
      )
    })
  } finally {
    setEmailProviderForTesting(undefined)
    if (previousForceDelivery === undefined) {
      delete process.env.FORCE_ACCOUNT_EMAIL_DELIVERY
    } else {
      process.env.FORCE_ACCOUNT_EMAIL_DELIVERY = previousForceDelivery
    }
  }

  await withMockedAuthPersistence(async ({ user, sessions }) => {
    const loginResult = await loginUser({
      email: user.email,
      password: "OldPass123",
    })
    const loginAccessPayload = verifyAccessToken(loginResult.accessToken)

    assert.ok(loginResult.accessToken)
    assert.equal(loginAccessPayload.sessionId, sessions[0]?.sessionId)
    await validateAccessTokenSession(loginAccessPayload)
    assert.equal(sessions.length, 1)
    assert.equal(sessions[0]?.tokenHash, hashRefreshToken(loginResult.refreshToken))
    assert.equal(sessions[0]?.revokedAt, undefined)

    const refreshResult = await rotateRefreshToken(loginResult.refreshToken)

    assert.ok(refreshResult.accessToken)
    assert.notEqual(refreshResult.refreshToken, loginResult.refreshToken)
    assert.equal(sessions.length, 2)
    assert.ok(sessions[0]?.revokedAt)
    assert.ok(sessions[0]?.rotatedAt)
    assert.equal(sessions[0]?.replacedBySessionId, sessions[1]?.sessionId)
    assert.equal(sessions[0]?.familyId, sessions[1]?.familyId)

    await assert.rejects(
      () => rotateRefreshToken(loginResult.refreshToken),
      (error) => isAppErrorCode(error, "AUTHENTICATION_FAILED"),
    )
    assert.ok(sessions.every((session) => session.revokedAt))
  })

  await withMockedAuthPersistence(async ({ user, sessions }) => {
    const legacyRefreshToken = createRefreshToken()
    user.refreshTokenHash = hashRefreshToken(legacyRefreshToken.token)
    user.refreshTokenExpiresAt = legacyRefreshToken.expiresAt

    const results = await Promise.allSettled([
      rotateRefreshToken(legacyRefreshToken.token),
      rotateRefreshToken(legacyRefreshToken.token),
    ])
    const fulfilled = results.filter(
      (result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof rotateRefreshToken>>> =>
        result.status === "fulfilled",
    )
    const rejected = results.filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    )

    assert.equal(fulfilled.length, 1)
    assert.equal(rejected.length, 1)
    assert.ok(isAppErrorCode(rejected[0]?.reason, "AUTHENTICATION_FAILED"))
    assert.equal(sessions.length, 1)
    assert.equal(
      sessions[0]?.tokenHash,
      hashRefreshToken(fulfilled[0]?.value.refreshToken ?? ""),
    )
    assert.equal(user.refreshTokenHash, undefined)
    assert.equal(user.refreshTokenExpiresAt, undefined)
  })

  await withMockedAuthPersistence(async ({ user, sessions }) => {
    const loginResult = await loginUser({
      email: user.email,
      password: "OldPass123",
    })

    await logoutUser(undefined, loginResult.refreshToken, undefined)

    assert.ok(sessions[0]?.revokedAt)
    await assert.rejects(
      () => validateAccessTokenSession(verifyAccessToken(loginResult.accessToken)),
      /Invalid access token session/,
    )
    await assert.rejects(
      () => rotateRefreshToken(loginResult.refreshToken),
      (error) => isAppErrorCode(error, "AUTHENTICATION_FAILED"),
    )
  })

  await withMockedAuthPersistence(async ({ user, sessions }) => {
    const firstLoginResult = await loginUser({
      email: user.email,
      password: "OldPass123",
    })
    const secondLoginResult = await loginUser({
      email: user.email,
      password: "OldPass123",
    })
    const firstSessionId = sessions[0]?.sessionId
    const secondSessionId = sessions[1]?.sessionId

    await logoutUser(
      user._id.toString(),
      firstLoginResult.refreshToken,
      undefined,
    )

    assert.ok(sessions.find((session) => session.sessionId === firstSessionId)?.revokedAt)
    assert.equal(
      sessions.find((session) => session.sessionId === secondSessionId)?.revokedAt,
      undefined,
    )

    const refreshResult = await rotateRefreshToken(secondLoginResult.refreshToken)

    assert.ok(refreshResult.accessToken)
    assert.equal(sessions.length, 3)
    assert.ok(sessions.find((session) => session.sessionId === secondSessionId)?.revokedAt)
    assert.equal(sessions[2]?.revokedAt, undefined)
  })

  await withMockedAuthPersistence(async ({ user, sessions }) => {
    const firstLoginResult = await loginUser({
      email: user.email,
      password: "OldPass123",
    })
    const secondLoginResult = await loginUser({
      email: user.email,
      password: "OldPass123",
    })

    await logoutUser(user._id.toString(), undefined, undefined)
    await logoutUser(user._id.toString(), "invalid-refresh-token", undefined)

    assert.equal(sessions[0]?.revokedAt, undefined)
    assert.equal(sessions[1]?.revokedAt, undefined)

    const refreshResult = await rotateRefreshToken(secondLoginResult.refreshToken)

    assert.ok(refreshResult.accessToken)
    assert.equal(sessions.length, 3)
    assert.equal(sessions[0]?.revokedAt, undefined)
    assert.ok(sessions[1]?.revokedAt)
    assert.equal(hashRefreshToken(firstLoginResult.refreshToken), sessions[0]?.tokenHash)
  })

  await withMockedAuthPersistence(async ({ user, sessions }) => {
    const loginResult = await loginUser({
      email: user.email,
      password: "OldPass123",
    })
    const accessPayload = verifyAccessToken(loginResult.accessToken)

    await logoutUser(undefined, undefined, accessPayload.sessionId)

    assert.ok(sessions[0]?.revokedAt)
    await assert.rejects(
      () => validateAccessTokenSession(accessPayload),
      /Invalid access token session/,
    )
  })

  await withMockedAuthPersistence(async ({ user, sessions }) => {
    const loginResult = await loginUser({
      email: user.email,
      password: "OldPass123",
    })
    const oldSessionId = sessions[0]?.sessionId
    const changePasswordResult = await changeUserPassword({
      userId: user._id.toString(),
      input: {
        currentPassword: "OldPass123",
        newPassword: "NewPass123",
      },
    })

    assert.ok(changePasswordResult.accessToken)
    assert.notEqual(changePasswordResult.refreshToken, loginResult.refreshToken)
    assert.equal(sessions.length, 2)
    assert.equal(sessions[0]?.sessionId, oldSessionId)
    assert.ok(sessions[0]?.revokedAt)
    assert.equal(sessions[1]?.revokedAt, undefined)
    await assert.rejects(
      () => validateAccessTokenSession(verifyAccessToken(loginResult.accessToken)),
      /Invalid access token session/,
    )
    await validateAccessTokenSession(
      verifyAccessToken(changePasswordResult.accessToken),
    )
    await assert.rejects(
      () => rotateRefreshToken(loginResult.refreshToken),
      (error) => isAppErrorCode(error, "AUTHENTICATION_FAILED"),
    )
  })

  await withMockedAuthPersistence(async ({ user, sessions }) => {
    const loginResult = await loginUser({
      email: user.email,
      password: "OldPass123",
    })
    const accessPayload = verifyAccessToken(loginResult.accessToken)

    sessions[0]!.expiresAt = new Date(Date.now() - 1000)
    await assert.rejects(
      () => validateAccessTokenSession(accessPayload),
      /Invalid access token session/,
    )
  })

  await withMockedAuthPersistence(async ({ user }) => {
    const token = signAccessToken({
      sub: user._id.toString(),
      role: user.role,
      sessionId: "missing-session",
    })

    await assert.rejects(
      () => validateAccessTokenSession(verifyAccessToken(token)),
      /Invalid access token session/,
    )
  })

  await withMockedAuthTokenCleanupPersistence(
    async (state) => {
      const { users, refreshSessions } = state
      const result = await runAuthTokenCleanup(
        new Date("2026-05-16T00:00:00.000Z"),
      )

      assert.equal(result.passwordResetTokensCleared, 1)
      assert.equal(result.emailVerificationTokensCleared, 1)
      assert.equal(result.expiredRefreshSessionsDeleted, 1)
      assert.equal(result.revokedRefreshSessionsDeleted, 1)
      assert.equal(result.refreshSessionGraceDays, 7)

      const expiredResetUser = users.find(
        (user) => user.email === "expired-reset@example.com",
      )
      const validResetUser = users.find(
        (user) => user.email === "valid-reset@example.com",
      )
      const expiredVerificationUser = users.find(
        (user) => user.email === "expired-verification@example.com",
      )
      const validVerificationUser = users.find(
        (user) => user.email === "valid-verification@example.com",
      )

      assert.equal(expiredResetUser?.passwordResetTokenHash, undefined)
      assert.equal(expiredResetUser?.passwordResetTokenExpiresAt, undefined)
      assert.equal(validResetUser?.passwordResetTokenHash, "valid-reset")
      assert.ok(validResetUser?.passwordResetTokenExpiresAt)
      assert.equal(
        expiredVerificationUser?.emailVerificationTokenHash,
        undefined,
      )
      assert.equal(
        expiredVerificationUser?.emailVerificationTokenExpiresAt,
        undefined,
      )
      assert.equal(
        validVerificationUser?.emailVerificationTokenHash,
        "valid-verification",
      )
      assert.ok(validVerificationUser?.emailVerificationTokenExpiresAt)
      assert.equal(users.length, 4)
      assert.equal(state.deletedUserCount, 0)
      assert.deepEqual(
        refreshSessions.map((session) => session.sessionId).sort(),
        ["active", "expired-recent", "revoked-recent"],
      )
    },
  )
}

run()
  .then(() => {
    console.log("security-blockers tests passed")
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
