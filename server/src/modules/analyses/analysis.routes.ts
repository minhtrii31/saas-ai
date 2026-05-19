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
  analyzeCvForUser,
  deleteUserAnalysis,
  getUserAnalysis,
  listUserAnalyses,
} from "./analysis.service"

export const analysisRouter = Router()

const aiRouteRateLimiter = createRateLimiter({
  name: "ai-analysis",
  windowMs: env.AI_ROUTE_RATE_LIMIT_WINDOW_MS,
  max: env.AI_ROUTE_RATE_LIMIT_MAX,
  code: "AI_ROUTE_RATE_LIMIT_EXCEEDED",
  message: "Too many AI requests. Please try again later.",
})

analysisRouter.post(
  "/api/cvs/:cvId/analyze",
  requireAuth,
  aiRouteRateLimiter,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest
      const request = req as RequestWithRequestId
      const { cvId } = req.params

      if (typeof cvId !== "string") {
        throw new AppError({
          code: "CV_NOT_FOUND",
          message: "CV not found",
          statusCode: 404,
        })
      }

      const analysis = await analyzeCvForUser({
        cvId,
        userId: authReq.user.id,
        requestId: request.requestId,
      })

      sendSuccess(request, res, { analysis }, 201)
    } catch (error) {
      next(error)
    }
  },
)

analysisRouter.get("/api/analyses", requireAuth, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest
    const cvId = typeof req.query.cvId === "string" ? req.query.cvId : undefined
    const result = await listUserAnalyses({
      userId: authReq.user.id,
      ...(cvId ? { cvId } : {}),
      pagination: parsePaginationQuery({
        query: req.query,
        allowedSortBy: ["createdAt", "updatedAt", "analyzedAt"],
        defaultSortBy: "createdAt",
      }),
    })

    sendSuccess(req as RequestWithRequestId, res, result)
  } catch (error) {
    next(error)
  }
})

analysisRouter.get(
  "/api/analyses/:analysisId",
  requireAuth,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest
      const { analysisId } = req.params

      if (typeof analysisId !== "string") {
        throw new AppError({
          code: "CV_ANALYSIS_NOT_FOUND",
          message: "Analysis not found",
          statusCode: 404,
        })
      }

      const analysis = await getUserAnalysis({
        analysisId,
        userId: authReq.user.id,
      })

      sendSuccess(req as RequestWithRequestId, res, { analysis })
    } catch (error) {
      next(error)
    }
  },
)

analysisRouter.delete(
  "/api/analyses/:analysisId",
  requireAuth,
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest
      const { analysisId } = req.params

      if (typeof analysisId !== "string") {
        throw new AppError({
          code: "CV_ANALYSIS_NOT_FOUND",
          message: "Analysis not found",
          statusCode: 404,
        })
      }

      const result = await deleteUserAnalysis({
        analysisId,
        userId: authReq.user.id,
      })

      sendSuccess(req as RequestWithRequestId, res, result)
    } catch (error) {
      next(error)
    }
  },
)
