import mammoth from "mammoth"
import { PDFParse } from "pdf-parse"

import { env } from "../../config/env"
import { AppError } from "../../shared/errors"
import type { CvParserMetadata } from "../../modules/cvs/cv.types"

export const PDF_MIME_TYPE = "application/pdf"
export const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

export type ParsedDocument = {
  text: string
  metadata: CvParserMetadata
}

type ParseCvDocumentOverride = (input: {
  buffer: Buffer
  mimeType: string
}) => Promise<ParsedDocument>

let parseCvDocumentOverride: ParseCvDocumentOverride | undefined

export const setParseCvDocumentForTesting = (
  override: ParseCvDocumentOverride | undefined,
): void => {
  parseCvDocumentOverride = override
}

const normalizeText = (text: string): string => {
  return text
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

const createParserError = (): AppError => {
  return new AppError({
    code: "CV_PARSING_FAILED",
    message: "The CV could not be parsed",
    statusCode: 422,
  })
}

const createParserTimeoutError = (): AppError => {
  return new AppError({
    code: "CV_PARSING_TIMEOUT",
    message: "The CV parser timed out",
    statusCode: 422,
  })
}

const enforceParsedTextLimit = (parsed: ParsedDocument): ParsedDocument => {
  if (parsed.text.length > env.CV_PARSED_TEXT_MAX_CHARACTERS) {
    throw new AppError({
      code: "CV_PARSED_TEXT_TOO_LARGE",
      message: "The parsed CV text is too large",
      statusCode: 413,
    })
  }

  return parsed
}

const withParserTimeout = async <T>(operation: Promise<T>): Promise<T> => {
  let timeout: NodeJS.Timeout | undefined

  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(
          () => reject(createParserTimeoutError()),
          env.CV_PARSE_TIMEOUT_MS,
        )
      }),
    ])
  } finally {
    if (timeout) {
      clearTimeout(timeout)
    }
  }
}

const parsePdf = async (buffer: Buffer): Promise<ParsedDocument> => {
  const parser = new PDFParse({ data: new Uint8Array(buffer) })

  try {
    const result = await parser.getText()
    const text = normalizeText(result.text)

    if (!text) {
      throw createParserError()
    }

    return {
      text,
      metadata: {
        parser: "pdf-parse",
        pageCount: result.total,
        characterCount: text.length,
      },
    }
  } finally {
    await parser.destroy()
  }
}

const parseDocx = async (buffer: Buffer): Promise<ParsedDocument> => {
  const result = await mammoth.extractRawText({ buffer })
  const text = normalizeText(result.value)
  const warnings = result.messages
    .map((message) => message.message)
    .filter((message) => message.length > 0)

  if (!text) {
    throw createParserError()
  }

  return {
    text,
    metadata: {
      parser: "mammoth",
      characterCount: text.length,
      ...(warnings.length > 0 ? { warnings } : {}),
    },
  }
}

export const parseCvDocument = async ({
  buffer,
  mimeType,
}: {
  buffer: Buffer
  mimeType: string
}): Promise<ParsedDocument> => {
  if (parseCvDocumentOverride) {
    return parseCvDocumentOverride({ buffer, mimeType })
  }

  try {
    if (mimeType === PDF_MIME_TYPE) {
      return enforceParsedTextLimit(await withParserTimeout(parsePdf(buffer)))
    }

    if (mimeType === DOCX_MIME_TYPE) {
      return enforceParsedTextLimit(await withParserTimeout(parseDocx(buffer)))
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }

    throw createParserError()
  }

  throw new AppError({
    code: "UNSUPPORTED_CV_FILE_TYPE",
    message: "Only PDF and DOCX files are supported",
    statusCode: 400,
  })
}
