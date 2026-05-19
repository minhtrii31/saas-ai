import type { NextFunction, Request, Response } from "express"

import { AppError } from "../shared/errors"
import { env } from "../config/env"
import { getRedisClient } from "../services/cache/redis"
import type { AuthenticatedRequest } from "../types/express"
import { logger } from "../utils/logger"

type RedisRateLimitClient = {
  incr: (key: string) => Promise<number>
  pExpire: (key: string, milliseconds: number) => Promise<unknown>
  pTTL: (key: string) => Promise<number>
}

type RateLimitOptions = {
  name: string
  windowMs: number
  max: number
  code: string
  message: string
  keyGenerator?: (req: Request) => string
}

type RateLimitEntry = {
  count: number
  resetAt: number
}

const stores = new Map<string, Map<string, RateLimitEntry>>()
const redisFallbackWarnings = new Set<string>()
let testRedisClient: RedisRateLimitClient | null | undefined

const getStore = (name: string): Map<string, RateLimitEntry> => {
  const existing = stores.get(name)

  if (existing) {
    return existing
  }

  const store = new Map<string, RateLimitEntry>()
  stores.set(name, store)
  return store
}

export const resetRateLimitStores = (): void => {
  stores.clear()
  redisFallbackWarnings.clear()
}

export const setRateLimitRedisClientForTesting = (
  client: RedisRateLimitClient | null,
): void => {
  testRedisClient = client
}

export const clearRateLimitRedisClientForTesting = (): void => {
  testRedisClient = undefined
}

const defaultKeyGenerator = (req: Request): string => {
  const user = (req as Partial<AuthenticatedRequest>).user
  return user?.id ? `user:${user.id}` : `ip:${req.ip ?? "unknown"}`
}

const getRateLimitRedisClient = (): RedisRateLimitClient | null => {
  if (testRedisClient !== undefined) {
    return testRedisClient
  }

  return getRedisClient()
}

export const createRateLimiter = ({
  name,
  windowMs,
  max,
  code,
  message,
  keyGenerator = defaultKeyGenerator,
}: RateLimitOptions) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const now = Date.now()
    const key = keyGenerator(req)
    const redis = getRateLimitRedisClient()

    try {
      if (redis) {
        const redisKey = `rate-limit:${name}:${key}`
        const count = await redis.incr(redisKey)

        if (count === 1) {
          await redis.pExpire(redisKey, windowMs)
        }

        const ttlMs = await redis.pTTL(redisKey)
        const resetAt = now + (ttlMs > 0 ? ttlMs : windowMs)

        res.setHeader("x-ratelimit-limit", String(max))
        res.setHeader(
          "x-ratelimit-remaining",
          String(Math.max(max - count, 0)),
        )
        res.setHeader("x-ratelimit-reset", new Date(resetAt).toISOString())

        if (count > max) {
          next(
            new AppError({
              code,
              message,
              statusCode: 429,
              details: {
                limit: max,
                retryAfterSeconds: Math.ceil((resetAt - now) / 1000),
              },
            }),
          )
          return
        }

        next()
        return
      }

      if (env.REDIS_URL && env.NODE_ENV === "production") {
        next(
          new AppError({
            code: "RATE_LIMIT_STORE_UNAVAILABLE",
            message: "Rate limiting is temporarily unavailable",
            statusCode: 503,
          }),
        )
        return
      }

      if (env.REDIS_URL && !redisFallbackWarnings.has(name)) {
        redisFallbackWarnings.add(name)
        logger.warn("Redis rate-limit store unavailable; using memory fallback", {
          rateLimitName: name,
        })
      }

      const store = getStore(name)
      const existing = store.get(key)
      const entry =
        existing && existing.resetAt > now
          ? existing
          : {
              count: 0,
              resetAt: now + windowMs,
            }

      entry.count += 1
      store.set(key, entry)

      res.setHeader("x-ratelimit-limit", String(max))
      res.setHeader(
        "x-ratelimit-remaining",
        String(Math.max(max - entry.count, 0)),
      )
      res.setHeader("x-ratelimit-reset", new Date(entry.resetAt).toISOString())

      if (entry.count > max) {
        next(
          new AppError({
            code,
            message,
            statusCode: 429,
            details: {
              limit: max,
              retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
            },
          }),
        )
        return
      }

      next()
    } catch (error) {
      logger.error("Rate-limit store error", { error, rateLimitName: name })

      if (env.NODE_ENV !== "production") {
        const store = getStore(name)
        const existing = store.get(key)
        const entry =
          existing && existing.resetAt > now
            ? existing
            : {
                count: 0,
                resetAt: now + windowMs,
              }

        entry.count += 1
        store.set(key, entry)

        res.setHeader("x-ratelimit-limit", String(max))
        res.setHeader(
          "x-ratelimit-remaining",
          String(Math.max(max - entry.count, 0)),
        )
        res.setHeader("x-ratelimit-reset", new Date(entry.resetAt).toISOString())

        if (entry.count > max) {
          next(
            new AppError({
              code,
              message,
              statusCode: 429,
              details: {
                limit: max,
                retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
              },
            }),
          )
          return
        }

        next()
        return
      }

      next(
        new AppError({
          code: "RATE_LIMIT_STORE_UNAVAILABLE",
          message: "Rate limiting is temporarily unavailable",
          statusCode: 503,
        }),
      )
    }
  }
}
