export type JobDescriptionInputType = "pasted"

export type JobDescription = {
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

export type JobDescriptionSummary = Omit<JobDescription, "descriptionText">
