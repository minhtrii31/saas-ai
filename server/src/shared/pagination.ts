import { z } from "zod"

export const SORT_ORDERS = ["asc", "desc"] as const

export type SortOrder = (typeof SORT_ORDERS)[number]

export type PaginationInput<TSortBy extends string = string> = {
  page: number
  pageSize: number
  sortBy: TSortBy
  sortOrder: SortOrder
  skip: number
}

export type PaginationResult = {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

const basePaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortOrder: z.enum(SORT_ORDERS).default("desc"),
})

export const parsePaginationQuery = <TSortBy extends string>({
  query,
  allowedSortBy,
  defaultSortBy,
}: {
  query: unknown
  allowedSortBy: readonly TSortBy[]
  defaultSortBy: TSortBy
}): PaginationInput<TSortBy> => {
  const schema = basePaginationSchema.extend({
    sortBy: z
      .string()
      .refine((value): value is TSortBy => allowedSortBy.includes(value as TSortBy))
      .default(defaultSortBy),
  })
  const parsed = schema.parse(query)

  return {
    ...parsed,
    skip: (parsed.page - 1) * parsed.pageSize,
  }
}

export const createPaginationResult = ({
  page,
  pageSize,
  totalItems,
}: {
  page: number
  pageSize: number
  totalItems: number
}): PaginationResult => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  return {
    page,
    pageSize,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  }
}
