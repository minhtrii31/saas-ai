import { createClient, type RedisClientType } from "redis"

import { env } from "../../config/env"
import { logger } from "../../utils/logger"

export type RedisStatus =
  | "not_configured"
  | "disconnected"
  | "connecting"
  | "connected"

let redisClient: RedisClientType | null = null
let redisStatus: RedisStatus = env.REDIS_URL ? "disconnected" : "not_configured"

export const getRedisStatus = (): RedisStatus => redisStatus

export const getRedisClient = (): RedisClientType | null => {
  if (!redisClient?.isOpen) {
    return null
  }

  return redisClient
}

export const connectRedis = async (): Promise<RedisClientType | null> => {
  if (!env.REDIS_URL) {
    return null
  }

  if (redisClient?.isOpen) {
    return redisClient
  }

  redisStatus = "connecting"
  redisClient = createClient({ url: env.REDIS_URL })

  redisClient.on("error", (error) => {
    redisStatus = "disconnected"
    logger.error("Redis connection error", { error })
  })

  try {
    await redisClient.connect()
    redisStatus = "connected"
    logger.info("Redis connection established")
  } catch (error) {
    redisStatus = "disconnected"
    logger.error("Redis connection failed", { error })

    if (env.NODE_ENV === "production") {
      throw error
    }

    return null
  }

  return redisClient
}

export const disconnectRedis = async (): Promise<void> => {
  if (redisClient?.isOpen) {
    await redisClient.disconnect()
  }

  redisStatus = env.REDIS_URL ? "disconnected" : "not_configured"
}
