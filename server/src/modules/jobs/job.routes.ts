import { Router } from "express"

import { sendSuccess } from "../../shared/api-response"
import { AppError } from "../../shared/errors"
import { parsePaginationQuery } from "../../shared/pagination"
import type {
  AuthenticatedRequest,
  RequestWithRequestId,
} from "../../types/express"
import { requireAuth } from "../auth/auth.middleware"
import {
  createJobDescriptionForUser,
  deleteUserJobDescription,
  getUserJobDescription,
  listUserJobDescriptions,
  updateUserJobDescription,
} from "./job.service"
import { jobSearchSchema } from "./job.validation"

export const jobRouter = Router()

jobRouter.post("/api/jobs", requireAuth, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest
    const job = await createJobDescriptionForUser({
      input: req.body,
      userId: authReq.user.id,
    })

    sendSuccess(req as RequestWithRequestId, res, { job }, 201)
  } catch (error) {
    next(error)
  }
})

jobRouter.get("/api/jobs", requireAuth, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest
    const search = jobSearchSchema.parse(
      typeof req.query.search === "string" ? req.query.search : undefined,
    )
    const result = await listUserJobDescriptions({
      userId: authReq.user.id,
      ...(search ? { search } : {}),
      pagination: parsePaginationQuery({
        query: req.query,
        allowedSortBy: ["createdAt", "updatedAt", "title", "company"],
        defaultSortBy: "createdAt",
      }),
    })

    sendSuccess(req as RequestWithRequestId, res, result)
  } catch (error) {
    next(error)
  }
})

jobRouter.get("/api/jobs/:jobId", requireAuth, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest
    const { jobId } = req.params

    if (typeof jobId !== "string") {
      throw new AppError({
        code: "JOB_DESCRIPTION_NOT_FOUND",
        message: "Job description not found",
        statusCode: 404,
      })
    }

    const job = await getUserJobDescription({
      jobDescriptionId: jobId,
      userId: authReq.user.id,
    })

    sendSuccess(req as RequestWithRequestId, res, { job })
  } catch (error) {
    next(error)
  }
})

jobRouter.patch("/api/jobs/:jobId", requireAuth, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest
    const { jobId } = req.params

    if (typeof jobId !== "string") {
      throw new AppError({
        code: "JOB_DESCRIPTION_NOT_FOUND",
        message: "Job description not found",
        statusCode: 404,
      })
    }

    const job = await updateUserJobDescription({
      jobDescriptionId: jobId,
      userId: authReq.user.id,
      input: req.body,
    })

    sendSuccess(req as RequestWithRequestId, res, { job })
  } catch (error) {
    next(error)
  }
})

jobRouter.delete("/api/jobs/:jobId", requireAuth, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest
    const { jobId } = req.params

    if (typeof jobId !== "string") {
      throw new AppError({
        code: "JOB_DESCRIPTION_NOT_FOUND",
        message: "Job description not found",
        statusCode: 404,
      })
    }

    const result = await deleteUserJobDescription({
      jobDescriptionId: jobId,
      userId: authReq.user.id,
    })

    sendSuccess(req as RequestWithRequestId, res, result)
  } catch (error) {
    next(error)
  }
})
