import { Schema, model, models, type HydratedDocument, type Model } from "mongoose"

import {
  JOB_DESCRIPTION_INPUT_TYPES,
  type JobDescriptionDocumentShape,
} from "./job.types"

export type JobDescriptionDocument =
  HydratedDocument<JobDescriptionDocumentShape>

const jobDescriptionSchema = new Schema<JobDescriptionDocumentShape>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
    },
    descriptionText: {
      type: String,
      required: true,
      trim: true,
    },
    inputType: {
      type: String,
      enum: JOB_DESCRIPTION_INPUT_TYPES,
      required: true,
    },
    sourceUrl: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

jobDescriptionSchema.index({ userId: 1, createdAt: -1 })

export const JobDescriptionModel: Model<JobDescriptionDocumentShape> =
  (models.JobDescription as Model<JobDescriptionDocumentShape> | undefined) ??
  model<JobDescriptionDocumentShape>(
    "JobDescription",
    jobDescriptionSchema,
  )
