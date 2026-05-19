import { Router } from "express"

import { sendSuccess } from "../../shared/api-response"
import type { RequestWithRequestId } from "../../types/express"
import { openApiDocument } from "./openapi.document"

export const openApiRouter = Router()

openApiRouter.get("/api/docs/openapi.json", (req, res) => {
  sendSuccess(req as RequestWithRequestId, res, { openapi: openApiDocument })
})
