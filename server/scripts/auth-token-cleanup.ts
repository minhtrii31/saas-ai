import { connectDatabase, disconnectDatabase } from "../src/config/database"
import { runAuthTokenCleanup } from "../src/modules/auth/auth-token-cleanup.service"

const run = async (): Promise<void> => {
  await connectDatabase()

  try {
    const result = await runAuthTokenCleanup()
    console.log(JSON.stringify(result, null, 2))
  } finally {
    await disconnectDatabase()
  }
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
