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
  compareCvWithJobForUser,
  deleteUserComparison,
  getUserComparison,
  listUserComparisons,
} from "./comparison.service"

export const comparisonRouter = Router()

const aiRouteRateLimiter = createRateLimiter({
  name: "ai-comparison",
  windowMs: env.AI_ROUTE_RATE_LIMIT_WINDOW_MS,
  max: env.AI_ROUTE_RATE_LIMIT_MAX,
  code: "AI_ROUTE_RATE_LIMIT_EXCEEDED",
  message: "Too many AI requests. Please try again later.",
})

comparisonRouter.post(
  "/api/comparisons",
  requireAuth,
  aiRouteRateLimiter,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest
      const request = req as RequestWithRequestId
      const comparison = await compareCvWithJobForUser({
        input: req.body,
        userId: authReq.user.id,
        requestId: request.requestId,
      })

      sendSuccess(request, res, { comparison }, 201)
    } catch (error) {
      next(error)
    }
  },
)

comparisonRouter.get("/api/comparisons", requireAuth, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest
    const cvId = typeof req.query.cvId === "string" ? req.query.cvId : undefined
    const jobDescriptionId =
      typeof req.query.jobDescriptionId === "string"
        ? req.query.jobDescriptionId
        : undefined
    const result = await listUserComparisons({
      userId: authReq.user.id,
      ...(cvId ? { cvId } : {}),
      ...(jobDescriptionId ? { jobDescriptionId } : {}),
      pagination: parsePaginationQuery({
        query: req.query,
        allowedSortBy: ["createdAt", "updatedAt", "comparedAt"],
        defaultSortBy: "createdAt",
      }),
    })

    sendSuccess(req as RequestWithRequestId, res, result)
  } catch (error) {
    next(error)
  }
})

comparisonRouter.get(
  "/api/comparisons/:comparisonId",
  requireAuth,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest
      const { comparisonId } = req.params

      if (typeof comparisonId !== "string") {
        throw new AppError({
          code: "CV_JOB_COMPARISON_NOT_FOUND",
          message: "Comparison not found",
          statusCode: 404,
        })
      }

      const comparison = await getUserComparison({
        comparisonId,
        userId: authReq.user.id,
      })

      sendSuccess(req as RequestWithRequestId, res, { comparison })
    } catch (error) {
      next(error)
    }
  },
)

comparisonRouter.delete(
  "/api/comparisons/:comparisonId",
  requireAuth,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest
      const { comparisonId } = req.params

      if (typeof comparisonId !== "string") {
        throw new AppError({
          code: "CV_JOB_COMPARISON_NOT_FOUND",
          message: "Comparison not found",
          statusCode: 404,
        })
      }

      const result = await deleteUserComparison({
        comparisonId,
        userId: authReq.user.id,
      })

      sendSuccess(req as RequestWithRequestId, res, result)
    } catch (error) {
      next(error)
    }
  },
)
