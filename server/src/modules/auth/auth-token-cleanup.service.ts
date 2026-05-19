import {
  clearExpiredEmailVerificationTokens,
  clearExpiredPasswordResetTokens,
} from "../users/user.repository"
import {
  deleteExpiredRefreshSessionsBefore,
  deleteRevokedRefreshSessionsBefore,
} from "./refresh-session.repository"

const REFRESH_SESSION_CLEANUP_GRACE_MS = 7 * 24 * 60 * 60 * 1000

export type AuthTokenCleanupResult = {
  passwordResetTokensCleared: number
  emailVerificationTokensCleared: number
  expiredRefreshSessionsDeleted: number
  revokedRefreshSessionsDeleted: number
  refreshSessionGraceDays: number
}

export const runAuthTokenCleanup = async (
  now: Date = new Date(),
): Promise<AuthTokenCleanupResult> => {
  const refreshSessionCutoff = new Date(
    now.getTime() - REFRESH_SESSION_CLEANUP_GRACE_MS,
  )

  const [
    passwordResetTokensCleared,
    emailVerificationTokensCleared,
    expiredRefreshSessionsDeleted,
    revokedRefreshSessionsDeleted,
  ] = await Promise.all([
    clearExpiredPasswordResetTokens({ now }),
    clearExpiredEmailVerificationTokens({ now }),
    deleteExpiredRefreshSessionsBefore({ cutoff: refreshSessionCutoff }),
    deleteRevokedRefreshSessionsBefore({ cutoff: refreshSessionCutoff }),
  ])

  return {
    passwordResetTokensCleared,
    emailVerificationTokensCleared,
    expiredRefreshSessionsDeleted,
    revokedRefreshSessionsDeleted,
    refreshSessionGraceDays:
      REFRESH_SESSION_CLEANUP_GRACE_MS / (24 * 60 * 60 * 1000),
  }
}
