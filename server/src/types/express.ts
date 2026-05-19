import type { Request } from "express"
import type { UserRole } from "../modules/users/user.types"

export type AuthenticatedUser = {
  id: string
  role: UserRole
}

export type RequestWithRequestId = Request & {
  requestId: string
}

export type AuthenticatedRequest = RequestWithRequestId & {
  user: AuthenticatedUser
}
