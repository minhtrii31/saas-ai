import type { Types } from "mongoose"

export type OwnedDocument = {
  userId: Types.ObjectId | string
}

export const ownerFilter = <TDocument extends OwnedDocument>(
  userId: string,
  filter: Partial<TDocument> = {},
): Partial<TDocument> & { userId: string } => {
  return {
    ...filter,
    userId,
  }
}

export const isOwnedBy = (
  resource: OwnedDocument,
  userId: string,
): boolean => {
  return resource.userId.toString() === userId
}
