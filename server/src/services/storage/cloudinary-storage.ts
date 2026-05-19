import { v2 as cloudinary, type UploadApiResponse } from "cloudinary"

import { env } from "../../config/env"
import { AppError } from "../../shared/errors"

export type StoredCvFile = {
  provider: "cloudinary"
  publicId: string
}

type CloudinaryDestroyResult = {
  result?: string
}

type StorageOverride = {
  upload?: typeof uploadCvFileToCloudinary
  delete?: typeof deleteCloudinaryRawAsset
  signedUrl?: typeof createSignedCvAssetUrl
}

let storageOverride: StorageOverride | undefined

export const setCloudinaryStorageForTesting = (
  override: StorageOverride | undefined,
): void => {
  storageOverride = override
}

const getCloudinaryConfig = (): {
  cloudName: string
  apiKey: string
  apiSecret: string
} => {
  if (
    !env.CLOUDINARY_CLOUD_NAME ||
    !env.CLOUDINARY_API_KEY ||
    !env.CLOUDINARY_API_SECRET
  ) {
    throw new AppError({
      code: "UPLOAD_STORAGE_NOT_CONFIGURED",
      message: "Upload storage is not configured",
      statusCode: 503,
    })
  }

  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    apiSecret: env.CLOUDINARY_API_SECRET,
  }
}

const configureCloudinary = (config: {
  cloudName: string
  apiKey: string
  apiSecret: string
}): void => {
  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    secure: true,
  })
}

export const uploadCvFileToCloudinary = async ({
  buffer,
  originalFileName,
}: {
  buffer: Buffer
  originalFileName: string
}): Promise<StoredCvFile> => {
  if (storageOverride?.upload) {
    return storageOverride.upload({ buffer, originalFileName })
  }

  const cloudinaryConfig = getCloudinaryConfig()
  configureCloudinary(cloudinaryConfig)

  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: env.CLOUDINARY_CV_FOLDER,
        resource_type: "raw",
        type: "authenticated",
        use_filename: true,
        unique_filename: true,
        filename_override: originalFileName,
      },
      (error, uploadResult) => {
        if (error) {
          reject(
            new AppError({
              code: "UPLOAD_STORAGE_FAILED",
              message: "The file could not be uploaded",
              statusCode: 502,
            }),
          )
          return
        }

        if (!uploadResult?.public_id) {
          reject(
            new AppError({
              code: "UPLOAD_STORAGE_FAILED",
              message: "The file could not be uploaded",
              statusCode: 502,
            }),
          )
          return
        }

        resolve(uploadResult)
      },
    )

    stream.end(buffer)
  })

  return {
    provider: "cloudinary",
    publicId: result.public_id,
  }
}

const destroyRawAsset = async ({
  publicId,
  deliveryType,
}: {
  publicId: string
  deliveryType?: "authenticated" | "upload"
}): Promise<string | undefined> => {
  const result = await new Promise<CloudinaryDestroyResult>((resolve, reject) => {
    cloudinary.uploader.destroy(
      publicId,
      {
        resource_type: "raw",
        ...(deliveryType ? { type: deliveryType } : {}),
        invalidate: true,
      },
      (error, destroyResult) => {
        if (error) {
          reject(
            new AppError({
              code: "UPLOAD_STORAGE_DELETE_FAILED",
              message: "The stored file could not be deleted",
              statusCode: 502,
            }),
          )
          return
        }

        resolve((destroyResult ?? {}) as CloudinaryDestroyResult)
      },
    )
  })

  if (result.result && !["ok", "not found"].includes(result.result)) {
    throw new AppError({
      code: "UPLOAD_STORAGE_DELETE_FAILED",
      message: "The stored file could not be deleted",
      statusCode: 502,
    })
  }

  return result.result
}

export const deleteCloudinaryRawAsset = async ({
  publicId,
}: {
  publicId: string
}): Promise<void> => {
  if (storageOverride?.delete) {
    return storageOverride.delete({ publicId })
  }

  const cloudinaryConfig = getCloudinaryConfig()
  configureCloudinary(cloudinaryConfig)

  const authenticatedResult = await destroyRawAsset({
    publicId,
    deliveryType: "authenticated",
  })

  if (authenticatedResult !== "ok") {
    await destroyRawAsset({ publicId, deliveryType: "upload" })
  }
}

export const createSignedCvAssetUrl = ({
  publicId,
  expiresAt,
}: {
  publicId: string
  expiresAt: Date
}): string => {
  if (storageOverride?.signedUrl) {
    return storageOverride.signedUrl({ publicId, expiresAt })
  }

  const cloudinaryConfig = getCloudinaryConfig()
  configureCloudinary(cloudinaryConfig)

  return cloudinary.url(publicId, {
    resource_type: "raw",
    type: "authenticated",
    sign_url: true,
    secure: true,
    expires_at: Math.floor(expiresAt.getTime() / 1000),
  })
}
