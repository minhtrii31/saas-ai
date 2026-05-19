import type {
  AuthSession,
  CompleteEmailVerificationInput,
  CompletePasswordResetInput,
  LoginInput,
  PublicUser,
  RegisterInput,
  RequestEmailVerificationResponse,
  RequestPasswordResetResponse,
  UpdateProfileInput,
} from "@/types/auth"

import { apiRequest } from "./client"

export const authApi = {
  login(input: LoginInput) {
    return apiRequest<AuthSession>("/api/auth/login", {
      method: "POST",
      body: input,
    })
  },

  register(input: RegisterInput) {
    return apiRequest<AuthSession>("/api/auth/register", {
      method: "POST",
      body: input,
    })
  },

  refresh() {
    return apiRequest<AuthSession>("/api/auth/refresh", {
      method: "POST",
    })
  },

  logout(accessToken: string | null) {
    return apiRequest<{ loggedOut: true }>("/api/auth/logout", {
      method: "POST",
      accessToken,
    })
  },

  me(accessToken: string | null) {
    return apiRequest<{ user: PublicUser }>("/api/auth/me", {
      accessToken,
    })
  },

  updateProfile(input: UpdateProfileInput, accessToken: string | null) {
    return apiRequest<{ user: PublicUser }>("/api/auth/me", {
      method: "PATCH",
      body: input,
      accessToken,
    })
  },

  requestEmailVerification(accessToken: string | null) {
    return apiRequest<RequestEmailVerificationResponse>(
      "/api/auth/email-verification/request",
      {
        method: "POST",
        accessToken,
      }
    )
  },

  completeEmailVerification(input: CompleteEmailVerificationInput) {
    return apiRequest<{ user: PublicUser }>(
      "/api/auth/email-verification/complete",
      {
        method: "POST",
        body: input,
      }
    )
  },

  requestPasswordReset(email: string) {
    return apiRequest<RequestPasswordResetResponse>(
      "/api/auth/password-reset/request",
      {
        method: "POST",
        body: { email },
      }
    )
  },

  completePasswordReset(input: CompletePasswordResetInput) {
    return apiRequest<AuthSession>("/api/auth/password-reset/complete", {
      method: "POST",
      body: input,
    })
  },
}
