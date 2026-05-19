import { Router } from "express"

import { getDatabaseStatus, isDatabaseReady } from "../../config/database"
import { env } from "../../config/env"
import { getRedisStatus } from "../../services/cache/redis"
import { sendSuccess } from "../../shared/api-response"
import type { RequestWithRequestId } from "../../types/express"

export const healthRouter = Router()

healthRouter.get("/health", (req, res) => {
  sendSuccess(req as RequestWithRequestId, res, {
    status: "ok",
    service: "saas-ai-api",
  })
})

healthRouter.get("/ready", (req, res) => {
  const database = getDatabaseStatus()
  const redis = getRedisStatus()
  const redisReady =
    !env.REDIS_URL || redis === "connected" || env.NODE_ENV !== "production"
  const ready = isDatabaseReady() && redisReady

  sendSuccess(
    req as RequestWithRequestId,
    res,
    {
      status: ready ? "ready" : "not_ready",
      checks: {
        app: "ready",
        database,
        redis,
      },
    },
    ready ? 200 : 503,
  )
})
