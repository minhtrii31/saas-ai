import type { Types } from "mongoose"

export const JOB_DESCRIPTION_INPUT_TYPES = ["pasted"] as const

export type JobDescriptionInputType =
  (typeof JOB_DESCRIPTION_INPUT_TYPES)[number]

export type JobDescriptionDocumentShape = {
  userId: Types.ObjectId
  title: string
  company?: string
  descriptionText: string
  inputType: JobDescriptionInputType
  sourceUrl?: string
  createdAt: Date
  updatedAt: Date
}

export type PublicJobDescription = {
  id: string
  userId: string
  title: string
  company?: string
  descriptionText: string
  descriptionTextCharacterCount: number
  hasDescriptionText: boolean
  inputType: JobDescriptionInputType
  sourceUrl?: string
  createdAt: string
  updatedAt: string
}

export type PublicJobDescriptionSummary = Omit<
  PublicJobDescription,
  "descriptionText"
>
