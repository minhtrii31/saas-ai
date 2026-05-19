import { JobDescriptionModel, type JobDescriptionDocument } from "./job.model"
import type { JobDescriptionDocumentShape } from "./job.types"

const escapeRegex = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export const createJobDescription = async (
  job: Omit<JobDescriptionDocumentShape, "createdAt" | "updatedAt">,
): Promise<JobDescriptionDocument> => {
  return JobDescriptionModel.create(job)
}

export const findJobDescriptionByIdForUser = async ({
  jobDescriptionId,
  userId,
}: {
  jobDescriptionId: string
  userId: string
}): Promise<JobDescriptionDocument | null> => {
  return JobDescriptionModel.findOne({ _id: jobDescriptionId, userId }).exec()
}

export const deleteJobDescriptionByIdForUser = async ({
  jobDescriptionId,
  userId,
}: {
  jobDescriptionId: string
  userId: string
}): Promise<JobDescriptionDocument | null> => {
  return JobDescriptionModel.findOneAndDelete({
    _id: jobDescriptionId,
    userId,
  }).exec()
}

export const updateJobDescriptionByIdForUser = async ({
  jobDescriptionId,
  userId,
  update,
}: {
  jobDescriptionId: string
  userId: string
  update: Partial<
    Pick<
      JobDescriptionDocumentShape,
      "title" | "company" | "descriptionText" | "sourceUrl"
    >
  >
}): Promise<JobDescriptionDocument | null> => {
  return JobDescriptionModel.findOneAndUpdate(
    { _id: jobDescriptionId, userId },
    update,
    { returnDocument: "after" },
  ).exec()
}

const getJobFilter = ({
  userId,
  search,
}: {
  userId: string
  search?: string
}) => {
  const escapedSearch = search ? escapeRegex(search) : undefined

  return {
    userId,
    ...(escapedSearch
      ? {
          $or: [
            { title: { $regex: escapedSearch, $options: "i" } },
            { company: { $regex: escapedSearch, $options: "i" } },
          ],
        }
      : {}),
  }
}

export const countJobDescriptionsForUser = async ({
  userId,
  search,
}: {
  userId: string
  search?: string
}): Promise<number> => {
  return JobDescriptionModel.countDocuments(
    getJobFilter({ userId, ...(search ? { search } : {}) }),
  ).exec()
}

export const listJobDescriptionsForUser = async ({
  userId,
  search,
  skip,
  limit,
  sortBy,
  sortOrder,
}: {
  userId: string
  search?: string
  skip: number
  limit: number
  sortBy: "createdAt" | "updatedAt" | "title" | "company"
  sortOrder: "asc" | "desc"
}): Promise<JobDescriptionDocument[]> => {
  return JobDescriptionModel.find(
    getJobFilter({ userId, ...(search ? { search } : {}) }),
  )
    .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
    .skip(skip)
    .limit(limit)
    .exec()
}
