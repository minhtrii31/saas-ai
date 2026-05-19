import { createServer } from "http"

import { app } from "./app"
import { connectDatabase, disconnectDatabase } from "./config/database"
import { env } from "./config/env"
import { connectRedis, disconnectRedis } from "./services/cache/redis"
import { logger } from "./utils/logger"

const server = createServer(app)

const startServer = async (): Promise<void> => {
  await connectDatabase()
  await connectRedis()

  server.listen(env.PORT, () => {
    logger.info("API server listening", { port: env.PORT })
  })
}

const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
  logger.info("Shutdown signal received; shutting down API server", { signal })

  server.close(async () => {
    await Promise.all([disconnectDatabase(), disconnectRedis()])
    process.exit(0)
  })
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)

startServer().catch((error) => {
  logger.error("Failed to start API server", { error })
  process.exit(1)
})
