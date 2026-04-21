/**
 * workers/cleanup.js
 * Background cron job — deletes abandoned in-progress quiz attempts older than 1 hour.
 * Runs every 30 minutes.
 */
const cron = require("node-cron")
const QuizAttempt = require("../models/QuizAttempt")

cron.schedule("*/30 * * * *", async () => {
  try {
    const cutoff = new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago

    const result = await QuizAttempt.deleteMany({
      status:    "in-progress",
      createdAt: { $lt: cutoff },
    })

    console.log(`[Cleanup] Removed ${result.deletedCount} expired in-progress attempts`)
  } catch (err) {
    console.error("[Cleanup] Worker error:", err.message)
  }
})

module.exports = () => console.log("[Cleanup] Worker started — runs every 30 minutes")
