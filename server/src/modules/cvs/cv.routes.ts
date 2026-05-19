import { Router } from "express"
import multer from "multer"

import { env } from "../../config/env"
import { requireAuth } from "../auth/auth.middleware"
import { sendSuccess } from "../../shared/api-response"
import { AppError } from "../../shared/errors"
import { parsePaginationQuery } from "../../shared/pagination"
import type {
  AuthenticatedRequest,
  RequestWithRequestId,
} from "../../types/express"
import {
  deleteUserCv,
  getUserCv,
  listUserCvs,
  uploadCvForUser,
} from "./cv.service"
import { CV_PARSER_STATUSES, type CvParserStatus } from "./cv.types"

export const cvRouter = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.CV_MAX_FILE_SIZE_BYTES,
    files: 1,
  },
})

const uploadSingleCv = upload.single("file")

cvRouter.post("/api/cvs", requireAuth, (req, res, next) => {
  uploadSingleCv(req, res, async (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        next(
          new AppError({
            code: "CV_FILE_TOO_LARGE",
            message: "CV files must be 5MB or smaller",
            statusCode: 413,
          }),
        )
        return
      }

      next(
        new AppError({
          code: "CV_UPLOAD_INVALID",
          message: "The CV upload could not be accepted",
          statusCode: 400,
        }),
      )
      return
    }

    if (error) {
      next(error)
      return
    }

    try {
      const authReq = req as AuthenticatedRequest
      const cv = await uploadCvForUser({
        userId: authReq.user.id,
        file: authReq.file,
      })

      sendSuccess(req as RequestWithRequestId, res, { cv }, 201)
    } catch (uploadError) {
      next(uploadError)
    }
  })
})

cvRouter.get("/api/cvs", requireAuth, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest
    const parserStatus = CV_PARSER_STATUSES.includes(
      req.query.parserStatus as CvParserStatus,
    )
      ? (req.query.parserStatus as CvParserStatus)
      : undefined
    const result = await listUserCvs({
      userId: authReq.user.id,
      ...(parserStatus ? { parserStatus } : {}),
      pagination: parsePaginationQuery({
        query: req.query,
        allowedSortBy: ["createdAt", "updatedAt", "uploadedAt", "title"],
        defaultSortBy: "createdAt",
      }),
    })

    sendSuccess(req as RequestWithRequestId, res, result)
  } catch (error) {
    next(error)
  }
})

cvRouter.get("/api/cvs/:cvId", requireAuth, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest
    const { cvId } = req.params

    if (typeof cvId !== "string") {
      throw new AppError({
        code: "CV_NOT_FOUND",
        message: "CV not found",
        statusCode: 404,
      })
    }

    const cv = await getUserCv({
      cvId,
      userId: authReq.user.id,
    })

    sendSuccess(req as RequestWithRequestId, res, { cv })
  } catch (error) {
    next(error)
  }
})

cvRouter.delete("/api/cvs/:cvId", requireAuth, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest
    const { cvId } = req.params

    if (typeof cvId !== "string") {
      throw new AppError({
        code: "CV_NOT_FOUND",
        message: "CV not found",
        statusCode: 404,
      })
    }

    const result = await deleteUserCv({
      cvId,
      userId: authReq.user.id,
    })

    sendSuccess(req as RequestWithRequestId, res, result)
  } catch (error) {
    next(error)
  }
})
