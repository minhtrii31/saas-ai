import { Router } from "express"

import { env } from "../../config/env"
import { createRateLimiter } from "../../middleware/rate-limit"
import { sendSuccess } from "../../shared/api-response"
import { AppError } from "../../shared/errors"
import { parsePaginationQuery } from "../../shared/pagination"
import type {
  AuthenticatedRequest,
  RequestWithRequestId,
} from "../../types/express"
import { requireAuth } from "../auth/auth.middleware"
import {
  deleteUserGeneratedDocument,
  generateCoverLetterForUser,
  getUserGeneratedDocument,
  listUserGeneratedDocuments,
  updateUserGeneratedDocument,
} from "./document.service"
import {
  GENERATED_DOCUMENT_STATUSES,
  type GeneratedDocumentStatus,
} from "./document.types"

export const documentRouter = Router()

const aiRouteRateLimiter = createRateLimiter({
  name: "ai-document",
  windowMs: env.AI_ROUTE_RATE_LIMIT_WINDOW_MS,
  max: env.AI_ROUTE_RATE_LIMIT_MAX,
  code: "AI_ROUTE_RATE_LIMIT_EXCEEDED",
  message: "Too many AI requests. Please try again later.",
})

documentRouter.post(
  "/api/documents/cover-letter",
  requireAuth,
  aiRouteRateLimiter,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest
      const request = req as RequestWithRequestId
      const document = await generateCoverLetterForUser({
        input: req.body,
        userId: authReq.user.id,
        requestId: request.requestId,
      })

      sendSuccess(request, res, { document }, 201)
    } catch (error) {
      next(error)
    }
  },
)

documentRouter.get("/api/documents", requireAuth, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest
    const type = req.query.type === "cover_letter" ? "cover_letter" : undefined
    const status = GENERATED_DOCUMENT_STATUSES.includes(
      req.query.status as GeneratedDocumentStatus,
    )
      ? (req.query.status as GeneratedDocumentStatus)
      : undefined
    const cvId = typeof req.query.cvId === "string" ? req.query.cvId : undefined
    const jobDescriptionId =
      typeof req.query.jobDescriptionId === "string"
        ? req.query.jobDescriptionId
        : undefined
    const comparisonId =
      typeof req.query.comparisonId === "string"
        ? req.query.comparisonId
        : undefined
    const result = await listUserGeneratedDocuments({
      userId: authReq.user.id,
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
      ...(cvId ? { cvId } : {}),
      ...(jobDescriptionId ? { jobDescriptionId } : {}),
      ...(comparisonId ? { comparisonId } : {}),
      pagination: parsePaginationQuery({
        query: req.query,
        allowedSortBy: ["createdAt", "updatedAt", "generatedAt", "title"],
        defaultSortBy: "createdAt",
      }),
    })

    sendSuccess(req as RequestWithRequestId, res, result)
  } catch (error) {
    next(error)
  }
})

documentRouter.get(
  "/api/documents/:documentId",
  requireAuth,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest
      const { documentId } = req.params

      if (typeof documentId !== "string") {
        throw new AppError({
          code: "GENERATED_DOCUMENT_NOT_FOUND",
          message: "Generated document not found",
          statusCode: 404,
        })
      }

      const document = await getUserGeneratedDocument({
        documentId,
        userId: authReq.user.id,
      })

      sendSuccess(req as RequestWithRequestId, res, { document })
    } catch (error) {
      next(error)
    }
  },
)

documentRouter.patch(
  "/api/documents/:documentId",
  requireAuth,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest
      const { documentId } = req.params

      if (typeof documentId !== "string") {
        throw new AppError({
          code: "GENERATED_DOCUMENT_NOT_FOUND",
          message: "Generated document not found",
          statusCode: 404,
        })
      }

      const document = await updateUserGeneratedDocument({
        documentId,
        userId: authReq.user.id,
        input: req.body,
      })

      sendSuccess(req as RequestWithRequestId, res, { document })
    } catch (error) {
      next(error)
    }
  },
)

documentRouter.delete(
  "/api/documents/:documentId",
  requireAuth,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest
      const { documentId } = req.params

      if (typeof documentId !== "string") {
        throw new AppError({
          code: "GENERATED_DOCUMENT_NOT_FOUND",
          message: "Generated document not found",
          statusCode: 404,
        })
      }

      const result = await deleteUserGeneratedDocument({
        documentId,
        userId: authReq.user.id,
      })

      sendSuccess(req as RequestWithRequestId, res, result)
    } catch (error) {
      next(error)
    }
  },
)
