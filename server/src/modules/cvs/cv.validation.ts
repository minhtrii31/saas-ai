import path from "node:path"

import { env } from "../../config/env"
import { AppError } from "../../shared/errors"
import { DOCX_MIME_TYPE, PDF_MIME_TYPE } from "../../services/document-parser/document-parser"

const allowedExtensionsByMimeType = {
  [PDF_MIME_TYPE]: [".pdf"],
  [DOCX_MIME_TYPE]: [".docx"],
} as const

export const allowedCvMimeTypes = Object.keys(allowedExtensionsByMimeType)

export const validateCvUploadFile = (
  file:
    | {
        originalname: string
        mimetype: string
        size: number
        buffer: Buffer
      }
    | undefined,
): void => {
  if (!file) {
    throw new AppError({
      code: "CV_FILE_REQUIRED",
      message: "A PDF or DOCX CV file is required",
      statusCode: 400,
    })
  }

  const allowedExtensions =
    allowedExtensionsByMimeType[
      file.mimetype as keyof typeof allowedExtensionsByMimeType
    ]

  if (!allowedExtensions) {
    throw new AppError({
      code: "UNSUPPORTED_CV_FILE_TYPE",
      message: "Only PDF and DOCX files are supported",
      statusCode: 400,
    })
  }

  const extension = path.extname(file.originalname).toLowerCase()

  if (!allowedExtensions.includes(extension as never)) {
    throw new AppError({
      code: "UNSUPPORTED_CV_FILE_TYPE",
      message: "The file extension must match a PDF or DOCX file",
      statusCode: 400,
    })
  }

  if (file.size > env.CV_MAX_FILE_SIZE_BYTES) {
    throw new AppError({
      code: "CV_FILE_TOO_LARGE",
      message: "CV files must be 5MB or smaller",
      statusCode: 413,
    })
  }

  if (file.mimetype === PDF_MIME_TYPE && !hasPdfSignature(file.buffer)) {
    throw new AppError({
      code: "UNSUPPORTED_CV_FILE_TYPE",
      message: "The file content must match a valid PDF file",
      statusCode: 400,
    })
  }

  if (file.mimetype === DOCX_MIME_TYPE && !hasDocxSignature(file.buffer)) {
    throw new AppError({
      code: "UNSUPPORTED_CV_FILE_TYPE",
      message: "The file content must match a valid DOCX file",
      statusCode: 400,
    })
  }
}

const hasPdfSignature = (buffer: Buffer): boolean => {
  return buffer.subarray(0, 5).toString("ascii") === "%PDF-"
}

const hasDocxSignature = (buffer: Buffer): boolean => {
  if (
    buffer.length < 4 ||
    buffer.subarray(0, 4).toString("binary") !== "PK\u0003\u0004"
  ) {
    return false
  }

  return (
    buffer.includes(Buffer.from("[Content_Types].xml", "utf8")) &&
    buffer.includes(Buffer.from("word/", "utf8"))
  )
}
