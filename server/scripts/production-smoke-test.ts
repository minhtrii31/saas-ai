import { createServer, type Server } from "http"
import type { AddressInfo } from "net"
import mongoose from "mongoose"

import { app } from "../src/app"
import { connectDatabase, disconnectDatabase } from "../src/config/database"
import { env } from "../src/config/env"
import { RefreshSessionModel } from "../src/modules/auth/refresh-session.model"
import { UserModel } from "../src/modules/users/user.model"
import { createGeminiProvider } from "../src/services/ai/gemini-provider"
import { connectRedis, disconnectRedis, getRedisClient } from "../src/services/cache/redis"
import { ResendEmailProvider } from "../src/services/email/resend-email-provider"
import {
  deleteCloudinaryRawAsset,
  uploadCvFileToCloudinary,
} from "../src/services/storage/cloudinary-storage"

type CheckStatus = "PASS" | "FAIL" | "SKIP"

type CheckResult = {
  name: string
  status: CheckStatus
  detail?: string
}

type ApiResponse<T> = {
  data?: T
  error?: {
    code?: string
    message?: string
  }
}

type AuthResponse = {
  user: {
    id: string
    email: string
  }
  accessToken: string
}

const requiredEnvNames = [
  "NODE_ENV",
  "CLIENT_ORIGIN",
  "MONGODB_URI",
  "REDIS_URL",
  "ACCESS_TOKEN_SECRET",
  "JWT_ISSUER",
  "JWT_AUDIENCE",
  "EMAIL_PROVIDER",
  "EMAIL_FROM",
  "RESEND_API_KEY",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "GEMINI_API_KEY",
] as const

const results: CheckResult[] = []

const addResult = (name: string, status: CheckStatus, detail?: string): void => {
  results.push({ name, status, detail })
}

const fail = (message: string): never => {
  throw new Error(message)
}

const requireProductionEnv = (): void => {
  if (env.NODE_ENV !== "production") {
    fail("NODE_ENV must be production for this smoke gate")
  }

  if (env.EMAIL_PROVIDER !== "resend") {
    fail("EMAIL_PROVIDER must be resend for this smoke gate")
  }

  const missing = requiredEnvNames.filter((name) => !process.env[name])

  if (missing.length > 0) {
    fail(`Missing required smoke environment variables: ${missing.join(", ")}`)
  }
}

const getCookieValue = (setCookieHeaders: string[], cookieName: string): string => {
  for (const header of setCookieHeaders) {
    const [cookiePair = ""] = header.split(";")
    const [name, ...valueParts] = cookiePair.split("=")

    if (name === cookieName) {
      return valueParts.join("=")
    }
  }

  return fail(`Expected ${cookieName} cookie was not set`)
}

const getSetCookieHeaders = (response: Response): string[] => {
  const headers = response.headers as Headers & {
    getSetCookie?: () => string[]
  }

  const setCookieHeaders = headers.getSetCookie?.()
  if (setCookieHeaders?.length) {
    return setCookieHeaders
  }

  const singleHeader = response.headers.get("set-cookie")
  return singleHeader ? [singleHeader] : []
}

const requestJson = async <T>({
  baseUrl,
  path,
  method,
  body,
  cookie,
  accessToken,
  trustedOrigin,
}: {
  baseUrl: string
  path: string
  method: "GET" | "POST"
  body?: unknown
  cookie?: string
  accessToken?: string
  trustedOrigin?: string
}): Promise<{ response: Response; body: ApiResponse<T> }> => {
  const headers: Record<string, string> = {
    accept: "application/json",
  }

  if (body !== undefined) {
    headers["content-type"] = "application/json"
  }

  if (cookie) {
    headers.cookie = cookie
  }

  if (accessToken) {
    headers.authorization = `Bearer ${accessToken}`
  }

  if (trustedOrigin) {
    headers.origin = trustedOrigin
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  let parsedBody: ApiResponse<T>
  try {
    parsedBody = (await response.json()) as ApiResponse<T>
  } catch {
    parsedBody = {}
  }

  return { response, body: parsedBody }
}

const expectOk = <T>(
  result: { response: Response; body: ApiResponse<T> },
  checkName: string,
): T => {
  const data = result.body.data

  if (!result.response.ok || data === undefined) {
    throw new Error(`${checkName} failed with HTTP ${result.response.status}`)
  }

  return data
}

const startLocalServer = async (): Promise<{ baseUrl: string; server?: Server }> => {
  const configuredBaseUrl =
    process.env.PRODUCTION_SMOKE_BASE_URL ?? process.env.SMOKE_BASE_URL

  if (configuredBaseUrl) {
    return { baseUrl: configuredBaseUrl.replace(/\/$/, "") }
  }

  const server = createServer(app)

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => resolve())
  })

  const address = server.address()
  if (!address || typeof address === "string") {
    server.close()
    fail("Unable to determine local smoke server address")
  }
  const tcpAddress = address as AddressInfo

  return {
    baseUrl: `http://127.0.0.1:${tcpAddress.port}`,
    server,
  }
}

const closeServer = async (server: Server | undefined): Promise<void> => {
  if (!server) {
    return
  }

  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error)
        return
      }

      resolve()
    })
  })
}

const checkMongo = async (): Promise<void> => {
  await connectDatabase()
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    fail("MongoDB did not reach connected state")
  }

  const database = mongoose.connection.db
  if (!database) {
    throw new Error("MongoDB database handle is unavailable")
  }

  await database.admin().ping()
  addResult("MongoDB connection", "PASS")
}

const checkRedis = async (): Promise<void> => {
  const redis = await connectRedis()
  if (!redis) {
    throw new Error("Redis client is not configured")
  }

  const redisClient = redis
  const pong = await redisClient.ping()
  if (pong !== "PONG") {
    fail("Redis ping failed")
  }

  const markerKey = `production-smoke:${Date.now()}`
  await redisClient.set(markerKey, "ok", { EX: 60 })
  const value = await redisClient.get(markerKey)
  await redisClient.del(markerKey)

  if (value !== "ok") {
    fail("Redis read/write check failed")
  }

  addResult("Redis connection", "PASS")
}

const checkCloudinary = async (): Promise<string | undefined> => {
  const storedFile = await uploadCvFileToCloudinary({
    buffer: Buffer.from("production-smoke-test-delete-me\n", "utf8"),
    originalFileName: `production-smoke-test-delete-me-${Date.now()}.txt`,
  })

  addResult("Cloudinary upload", "PASS")
  return storedFile.publicId
}

const cleanupCloudinary = async (publicId: string | undefined): Promise<void> => {
  if (!publicId) {
    return
  }

  await deleteCloudinaryRawAsset({ publicId })
  addResult("Cloudinary cleanup", "PASS")
}

const checkResend = async (): Promise<void> => {
  const configuredTestEmail = process.env.PRODUCTION_SMOKE_EMAIL_TO
  const shouldSend = process.env.PRODUCTION_SMOKE_SEND_EMAIL === "true"

  if (configuredTestEmail && shouldSend) {
    const provider = new ResendEmailProvider(env.RESEND_API_KEY)
    await provider.send({
      from: env.EMAIL_FROM,
      to: configuredTestEmail,
      subject: "SaaS AI production smoke test",
      text: "Production smoke test email. No action is required.",
    })
    addResult("Resend provider", "PASS", "sent configured test email")
    return
  }

  const response = await fetch("https://api.resend.com/domains", {
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      accept: "application/json",
    },
  })

  if (!response.ok) {
    fail(`Resend provider validation failed with HTTP ${response.status}`)
  }

  addResult("Resend provider", "PASS", "dry-run API key validation")
}

const checkGemini = async (): Promise<void> => {
  const result = await createGeminiProvider().generateJson({
    prompt:
      'Return only valid JSON for a production smoke test: {"ok":true,"message":"pong"}',
  })

  const rawJson = result.rawJson
  const responseBody = rawJson as { ok?: unknown } | null
  if (
    !responseBody ||
    typeof responseBody !== "object" ||
    responseBody.ok !== true
  ) {
    fail("Gemini did not return the expected minimal JSON response")
  }

  addResult("Gemini API", "PASS")
}

const checkHealthAndReadiness = async (baseUrl: string): Promise<void> => {
  const health = await fetch(`${baseUrl}/health`)
  if (!health.ok) {
    fail(`Health check failed with HTTP ${health.status}`)
  }
  addResult("Backend /health", "PASS")

  const ready = await fetch(`${baseUrl}/ready`)
  if (!ready.ok) {
    fail(`Readiness check failed with HTTP ${ready.status}`)
  }
  addResult("Backend /ready", "PASS")
}

const cleanupTestUser = async (email: string, userId?: string): Promise<void> => {
  if (userId) {
    await RefreshSessionModel.deleteMany({ userId })
  }

  const result = await UserModel.deleteOne({ email })

  if (result.deletedCount > 0) {
    addResult("Test user cleanup", "PASS")
    return
  }

  addResult("Test user cleanup", "SKIP", "no test user record remained")
}

const checkAuthFlow = async (
  baseUrl: string,
): Promise<{ email: string; userId?: string }> => {
  const clientOrigin = env.CLIENT_ORIGIN ?? fail("CLIENT_ORIGIN is required")
  const trustedOrigin = new URL(clientOrigin).origin
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const email = `production-smoke+${suffix}@example.com`
  const password = `SmokeTest-${suffix}-A1!`

  const register = await requestJson<AuthResponse>({
    baseUrl,
    path: "/api/auth/register",
    method: "POST",
    body: {
      email,
      password,
      name: "Production Smoke Test DELETE ME",
    },
  })
  const registerData = expectOk(register, "Register")
  const userId = registerData.user.id
  const registerCookie = `${env.REFRESH_TOKEN_COOKIE_NAME}=${getCookieValue(
    getSetCookieHeaders(register.response),
    env.REFRESH_TOKEN_COOKIE_NAME,
  )}`
  addResult("Auth register", "PASS")

  const login = await requestJson<AuthResponse>({
    baseUrl,
    path: "/api/auth/login",
    method: "POST",
    body: { email, password },
  })
  const loginData = expectOk(login, "Login")
  const loginCookie = `${env.REFRESH_TOKEN_COOKIE_NAME}=${getCookieValue(
    getSetCookieHeaders(login.response),
    env.REFRESH_TOKEN_COOKIE_NAME,
  )}`
  addResult("Auth login", "PASS")

  const me = await requestJson<{ user: { id: string } }>({
    baseUrl,
    path: "/api/auth/me",
    method: "GET",
    accessToken: loginData.accessToken,
  })
  expectOk(me, "Authenticated user lookup")

  const refresh = await requestJson<AuthResponse>({
    baseUrl,
    path: "/api/auth/refresh",
    method: "POST",
    cookie: loginCookie || registerCookie,
    trustedOrigin,
  })
  const refreshData = expectOk(refresh, "Refresh")
  const refreshCookie = `${env.REFRESH_TOKEN_COOKIE_NAME}=${getCookieValue(
    getSetCookieHeaders(refresh.response),
    env.REFRESH_TOKEN_COOKIE_NAME,
  )}`
  addResult("Auth refresh", "PASS")

  const logout = await requestJson<{ loggedOut: boolean }>({
    baseUrl,
    path: "/api/auth/logout",
    method: "POST",
    cookie: refreshCookie,
    accessToken: refreshData.accessToken,
    trustedOrigin,
  })
  const logoutData = expectOk(logout, "Logout")
  if (logoutData.loggedOut !== true) {
    fail("Logout response did not confirm logout")
  }
  addResult("Auth logout", "PASS")

  return { email, userId }
}

const printResults = (): void => {
  console.log("Production smoke test results")
  for (const result of results) {
    const suffix = result.detail ? ` (${result.detail})` : ""
    console.log(`- ${result.status}: ${result.name}${suffix}`)
  }
}

const main = async (): Promise<void> => {
  let server: Server | undefined
  let uploadedPublicId: string | undefined
  let testUserEmail: string | undefined
  let testUserId: string | undefined
  let failed = false

  try {
    requireProductionEnv()

    await checkMongo()
    await checkRedis()
    uploadedPublicId = await checkCloudinary()
    await checkResend()
    await checkGemini()

    const startedServer = await startLocalServer()
    server = startedServer.server
    await checkHealthAndReadiness(startedServer.baseUrl)

    const authResult = await checkAuthFlow(startedServer.baseUrl)
    testUserEmail = authResult.email
    testUserId = authResult.userId
  } catch (error) {
    failed = true
    addResult("Production smoke gate", "FAIL", (error as Error).message)
  } finally {
    const redis = getRedisClient()
    if (testUserEmail) {
      try {
        await cleanupTestUser(testUserEmail, testUserId)
      } catch (error) {
        addResult("Test user cleanup", "FAIL", (error as Error).message)
      }
    }

    try {
      await cleanupCloudinary(uploadedPublicId)
    } catch (error) {
      addResult("Cloudinary cleanup", "FAIL", (error as Error).message)
    }

    if (redis) {
      await disconnectRedis()
    }
    await disconnectDatabase()
    await closeServer(server)

    printResults()
  }

  if (failed || results.some((result) => result.status === "FAIL")) {
    process.exitCode = 1
  }
}

main().catch(() => {
  process.exitCode = 1
})
