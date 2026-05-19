import mongoose from "mongoose"

import { env } from "./env"
import { logger } from "../utils/logger"

export type DatabaseStatus =
  | "not_configured"
  | "disconnected"
  | "connected"
  | "connecting"
  | "disconnecting"

const connectionStates: Record<number, DatabaseStatus> = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
}

export const getDatabaseStatus = (): DatabaseStatus => {
  if (!env.MONGODB_URI) {
    return "not_configured"
  }

  return connectionStates[mongoose.connection.readyState] ?? "disconnected"
}

export const isDatabaseReady = (): boolean => {
  return !env.MONGODB_URI || mongoose.connection.readyState === 1
}

export const connectDatabase = async (): Promise<void> => {
  if (!env.MONGODB_URI) {
    logger.info("MONGODB_URI is not configured; database connection skipped")
    return
  }

  if (mongoose.connection.readyState === 1) {
    return
  }

  await mongoose.connect(env.MONGODB_URI)
  logger.info("Database connection established")
}

export const disconnectDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect()
  }
}
