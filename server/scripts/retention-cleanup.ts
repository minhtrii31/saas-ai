import { connectDatabase, disconnectDatabase } from "../src/config/database"
import { runRetentionCleanup } from "../src/modules/cvs/cv.retention.service"

const run = async (): Promise<void> => {
  await connectDatabase()

  try {
    const result = await runRetentionCleanup()
    console.log(JSON.stringify(result, null, 2))
  } finally {
    await disconnectDatabase()
  }
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
