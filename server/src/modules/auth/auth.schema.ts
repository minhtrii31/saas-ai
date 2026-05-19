import { z } from "zod"

const optionalProfileTextSchema = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .optional()
    .transform((value) => {
      if (value === undefined) {
        return undefined
      }

      return value || null
    })

const avatarUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return undefined
    }

    return value || null
  })
  .refine(
    (value) => {
      if (value === undefined || value === null) {
        return true
      }

      try {
        const parsedUrl = new URL(value)

        return parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:"
      } catch {
        return false
      }
    },
    {
      message: "Avatar URL must be a valid HTTP or HTTPS URL",
    },
  )

export const registerSchema = z.object({
  body: z.object({
    email: z.email().trim().toLowerCase(),
    password: z.string().min(8).max(128),
    name: z.string().trim().min(1).max(120).optional(),
  }),
})

export const loginSchema = z.object({
  body: z.object({
    email: z.email().trim().toLowerCase(),
    password: z.string().min(1).max(128),
  }),
})

export const updateProfileSchema = z.object({
  body: z
    .object({
      name: optionalProfileTextSchema(120),
      avatarUrl: avatarUrlSchema,
    })
    .strict(),
})

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1).max(128),
    newPassword: z.string().min(8).max(128),
  }),
})

export const requestPasswordResetSchema = z.object({
  body: z.object({
    email: z.email().trim().toLowerCase(),
  }),
})

export const completePasswordResetSchema = z.object({
  body: z.object({
    token: z.string().trim().min(32).max(256),
    newPassword: z.string().min(8).max(128),
  }),
})

export const completeEmailVerificationSchema = z.object({
  body: z.object({
    token: z.string().trim().min(32).max(256),
  }),
})

export type RegisterInput = z.infer<typeof registerSchema>["body"]
export type LoginInput = z.infer<typeof loginSchema>["body"]
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>["body"]
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>["body"]
export type RequestPasswordResetInput = z.infer<
  typeof requestPasswordResetSchema
>["body"]
export type CompletePasswordResetInput = z.infer<
  typeof completePasswordResetSchema
>["body"]
export type CompleteEmailVerificationInput = z.infer<
  typeof completeEmailVerificationSchema
>["body"]
