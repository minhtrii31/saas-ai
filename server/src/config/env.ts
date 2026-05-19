import dotenv from "dotenv"
import { z } from "zod"

dotenv.config()

const emptyStringToUndefined = (value: unknown): unknown => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined
  }

  return value
}

const optionalNonEmptyString = z.preprocess(
  emptyStringToUndefined,
  z.string().trim().min(1).optional(),
)

const optionalHttpUrl = z.preprocess(
  emptyStringToUndefined,
  z
    .string()
    .trim()
    .url()
    .refine((value) => {
      const url = new URL(value)

      return url.protocol === "https:" || url.protocol === "http:"
    }, "Must use http or https")
    .refine((value) => {
      const url = new URL(value)

      return !url.username && !url.password
    }, "Must not include credentials")
    .optional(),
)

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: optionalHttpUrl,
  APP_BASE_URL: optionalHttpUrl,
  TRUST_PROXY: z.string().trim().default("false"),
  JSON_BODY_LIMIT: z.string().default("1mb"),
  MONGODB_URI: z.string().min(1).optional(),
  REDIS_URL: z.string().min(1).optional(),
  EMAIL_PROVIDER: z.enum(["console", "resend"]).default("console"),
  EMAIL_FROM: optionalNonEmptyString,
  RESEND_API_KEY: optionalNonEmptyString,
  ACCESS_TOKEN_SECRET: z.string().min(32).optional(),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default("15m"),
  JWT_ISSUER: optionalNonEmptyString,
  JWT_AUDIENCE: optionalNonEmptyString,
  REFRESH_TOKEN_COOKIE_NAME: z.string().min(1).default("refreshToken"),
  REFRESH_TOKEN_EXPIRES_DAYS: z.coerce.number().int().positive().default(7),
  UPLOAD_STORAGE_PROVIDER: z.enum(["cloudinary"]).default("cloudinary"),
  CLOUDINARY_CLOUD_NAME: z.string().min(1).optional(),
  CLOUDINARY_API_KEY: z.string().min(1).optional(),
  CLOUDINARY_API_SECRET: z.string().min(1).optional(),
  CLOUDINARY_FOLDER: z.string().min(1).optional(),
  CLOUDINARY_CV_FOLDER: z.string().min(1).optional(),
  CV_MAX_FILE_SIZE_BYTES: z.coerce.number().int().positive().default(5242880),
  CV_MAX_PAGE_COUNT: z.coerce.number().int().positive().default(5),
  CV_PARSE_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  CV_PARSED_TEXT_MAX_CHARACTERS: z.coerce
    .number()
    .int()
    .positive()
    .default(100000),
  CV_RETENTION_DAYS: z.coerce.number().int().positive().default(30),
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL_NAME: z.string().min(1).default("gemini-2.0-flash"),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  CV_ANALYSIS_DAILY_LIMIT: z.coerce.number().int().positive().default(5),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 60 * 1000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  AUTH_LOGIN_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().optional(),
  AUTH_LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().optional(),
  AUTH_REGISTER_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .optional(),
  AUTH_REGISTER_RATE_LIMIT_MAX: z.coerce.number().int().positive().optional(),
  AUTH_REFRESH_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .optional(),
  AUTH_REFRESH_RATE_LIMIT_MAX: z.coerce.number().int().positive().optional(),
  AI_ROUTE_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(60 * 1000),
  AI_ROUTE_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  JOB_DESCRIPTION_MAX_CHARACTERS: z.coerce
    .number()
    .int()
    .positive()
    .default(10000),
  CV_JOB_COMPARISON_DAILY_LIMIT: z.coerce.number().int().positive().default(5),
  COVER_LETTER_DAILY_LIMIT: z.coerce.number().int().positive().default(3),
})

const parsedEnv = envSchema.safeParse(process.env)

if (!parsedEnv.success) {
  const message = parsedEnv.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ")

  throw new Error(`Invalid environment configuration: ${message}`)
}

if (
  parsedEnv.data.NODE_ENV === "production" &&
  !parsedEnv.data.ACCESS_TOKEN_SECRET
) {
  throw new Error(
    "Invalid environment configuration: ACCESS_TOKEN_SECRET is required in production",
  )
}

if (parsedEnv.data.NODE_ENV === "production" && !parsedEnv.data.JWT_ISSUER) {
  throw new Error(
    "Invalid environment configuration: JWT_ISSUER is required in production",
  )
}

if (parsedEnv.data.NODE_ENV === "production" && !parsedEnv.data.JWT_AUDIENCE) {
  throw new Error(
    "Invalid environment configuration: JWT_AUDIENCE is required in production",
  )
}

if (parsedEnv.data.NODE_ENV === "production" && !parsedEnv.data.GEMINI_API_KEY) {
  throw new Error(
    "Invalid environment configuration: GEMINI_API_KEY is required in production",
  )
}

if (
  parsedEnv.data.NODE_ENV === "production" &&
  !parsedEnv.data.APP_BASE_URL &&
  !parsedEnv.data.CLIENT_ORIGIN
) {
  throw new Error(
    "Invalid environment configuration: APP_BASE_URL or CLIENT_ORIGIN is required in production",
  )
}

if (
  parsedEnv.data.NODE_ENV === "production" &&
  !parsedEnv.data.EMAIL_FROM
) {
  throw new Error(
    "Invalid environment configuration: EMAIL_FROM is required in production",
  )
}

if (
  parsedEnv.data.NODE_ENV === "production" &&
  parsedEnv.data.EMAIL_PROVIDER !== "resend"
) {
  throw new Error(
    "Invalid environment configuration: EMAIL_PROVIDER=resend is required in production",
  )
}

if (
  parsedEnv.data.NODE_ENV === "production" &&
  parsedEnv.data.EMAIL_PROVIDER === "resend" &&
  !parsedEnv.data.RESEND_API_KEY
) {
  throw new Error(
    "Invalid environment configuration: RESEND_API_KEY is required when EMAIL_PROVIDER=resend",
  )
}

const requiredProductionVariables: Array<keyof typeof parsedEnv.data> = [
  "CLIENT_ORIGIN",
  "MONGODB_URI",
  "REDIS_URL",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
]

if (parsedEnv.data.NODE_ENV === "production") {
  const missing = requiredProductionVariables.filter((key) => !parsedEnv.data[key])

  if (missing.length > 0) {
    throw new Error(
      `Invalid environment configuration: ${missing.join(
        ", ",
      )} required in production`,
    )
  }
}

const hasLegacyAuthLimitOverride =
  process.env.AUTH_RATE_LIMIT_MAX !== undefined ||
  process.env.AUTH_RATE_LIMIT_WINDOW_MS !== undefined

const getAuthRouteLimitMax = (
  explicitValue: number | undefined,
  developmentDefault: number,
): number => {
  if (explicitValue !== undefined) {
    return explicitValue
  }

  if (parsedEnv.data.NODE_ENV === "production" || hasLegacyAuthLimitOverride) {
    return parsedEnv.data.AUTH_RATE_LIMIT_MAX
  }

  return Math.max(parsedEnv.data.AUTH_RATE_LIMIT_MAX, developmentDefault)
}

export const env = {
  ...parsedEnv.data,
  AUTH_LOGIN_RATE_LIMIT_WINDOW_MS:
    parsedEnv.data.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS ??
    parsedEnv.data.AUTH_RATE_LIMIT_WINDOW_MS,
  AUTH_LOGIN_RATE_LIMIT_MAX: getAuthRouteLimitMax(
    parsedEnv.data.AUTH_LOGIN_RATE_LIMIT_MAX,
    300,
  ),
  AUTH_REGISTER_RATE_LIMIT_WINDOW_MS:
    parsedEnv.data.AUTH_REGISTER_RATE_LIMIT_WINDOW_MS ??
    parsedEnv.data.AUTH_RATE_LIMIT_WINDOW_MS,
  AUTH_REGISTER_RATE_LIMIT_MAX: getAuthRouteLimitMax(
    parsedEnv.data.AUTH_REGISTER_RATE_LIMIT_MAX,
    300,
  ),
  AUTH_REFRESH_RATE_LIMIT_WINDOW_MS:
    parsedEnv.data.AUTH_REFRESH_RATE_LIMIT_WINDOW_MS ??
    parsedEnv.data.AUTH_RATE_LIMIT_WINDOW_MS,
  AUTH_REFRESH_RATE_LIMIT_MAX: getAuthRouteLimitMax(
    parsedEnv.data.AUTH_REFRESH_RATE_LIMIT_MAX,
    600,
  ),
  ACCESS_TOKEN_SECRET:
    parsedEnv.data.ACCESS_TOKEN_SECRET ??
    "development-access-token-secret-change-before-production",
  JWT_ISSUER: parsedEnv.data.JWT_ISSUER ?? "saas-ai",
  JWT_AUDIENCE: parsedEnv.data.JWT_AUDIENCE ?? "saas-ai-api",
  EMAIL_FROM: parsedEnv.data.EMAIL_FROM ?? "SaaS AI <no-reply@example.local>",
  RESEND_API_KEY: parsedEnv.data.RESEND_API_KEY ?? "",
  CLOUDINARY_CV_FOLDER:
    parsedEnv.data.CLOUDINARY_CV_FOLDER ??
    parsedEnv.data.CLOUDINARY_FOLDER ??
    "saas-ai/cvs",
}
