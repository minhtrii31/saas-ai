"use client"

import * as React from "react"

import { authApi } from "@/lib/api/auth"
import type {
  AuthSession,
  LoginInput,
  PublicUser,
  RegisterInput,
  RequestEmailVerificationResponse,
  RequestPasswordResetResponse,
  UpdateProfileInput,
} from "@/types/auth"

type AuthStatus = "loading" | "authenticated" | "unauthenticated"

type AuthContextValue = {
  status: AuthStatus
  user: PublicUser | null
  accessToken: string | null
  login: (input: LoginInput) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  updateProfile: (input: UpdateProfileInput) => Promise<PublicUser>
  requestEmailVerification: () => Promise<RequestEmailVerificationResponse>
  completeEmailVerification: (token: string) => Promise<PublicUser>
  requestPasswordReset: (email: string) => Promise<RequestPasswordResetResponse>
  completePasswordReset: (
    token: string,
    newPassword: string
  ) => Promise<AuthSession>
  logout: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<AuthStatus>("loading")
  const [user, setUser] = React.useState<PublicUser | null>(null)
  const [accessToken, setAccessToken] = React.useState<string | null>(null)

  const applySession = React.useCallback(
    (session: { user: PublicUser; accessToken: string }) => {
      setUser(session.user)
      setAccessToken(session.accessToken)
      setStatus("authenticated")
    },
    []
  )

  const clearSession = React.useCallback(() => {
    setUser(null)
    setAccessToken(null)
    setStatus("unauthenticated")
  }, [])

  React.useEffect(() => {
    let active = true

    authApi
      .refresh()
      .then((session) => {
        if (active) {
          applySession(session)
        }
      })
      .catch(() => {
        if (active) {
          clearSession()
        }
      })

    return () => {
      active = false
    }
  }, [applySession, clearSession])

  const login = React.useCallback(
    async (input: LoginInput) => {
      const session = await authApi.login(input)
      applySession(session)
    },
    [applySession]
  )

  const register = React.useCallback(
    async (input: RegisterInput) => {
      const session = await authApi.register(input)
      applySession(session)
    },
    [applySession]
  )

  const updateProfile = React.useCallback(
    async (input: UpdateProfileInput) => {
      const result = await authApi.updateProfile(input, accessToken)
      setUser(result.user)

      return result.user
    },
    [accessToken]
  )

  const requestEmailVerification = React.useCallback(async () => {
    const result = await authApi.requestEmailVerification(accessToken)

    return result
  }, [accessToken])

  const completeEmailVerification = React.useCallback(async (token: string) => {
    const result = await authApi.completeEmailVerification({ token })
    setUser(result.user)

    return result.user
  }, [])

  const requestPasswordReset = React.useCallback(async (email: string) => {
    const result = await authApi.requestPasswordReset(email)

    return result
  }, [])

  const completePasswordReset = React.useCallback(
    async (token: string, newPassword: string) => {
      const result = await authApi.completePasswordReset({ token, newPassword })
      applySession(result)

      return result
    },
    [applySession]
  )

  const logout = React.useCallback(async () => {
    try {
      await authApi.logout(accessToken)
    } finally {
      clearSession()
    }
  }, [accessToken, clearSession])

  const value = React.useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      accessToken,
      login,
      register,
      updateProfile,
      requestEmailVerification,
      completeEmailVerification,
      requestPasswordReset,
      completePasswordReset,
      logout,
    }),
    [
      accessToken,
      completeEmailVerification,
      completePasswordReset,
      login,
      logout,
      register,
      requestEmailVerification,
      requestPasswordReset,
      status,
      updateProfile,
      user,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = React.useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }

  return context
}
