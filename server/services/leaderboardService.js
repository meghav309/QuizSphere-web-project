/**
 * services/leaderboardService.js
 * Updates leaderboard after every quiz submission.
 * Always called fire-and-forget — must never throw uncaught.
 */
const Leaderboard = require("../models/Leaderboard")
const User        = require("../models/User")

const MAX_RETRIES = 2

/**
 * Upsert this user's leaderboard entry, recalculate avgScore,
 * then re-rank the entire board by avgScore descending.
 *
 * @param {string} userId  — user UUID
 * @param {number} score   — score earned in this quiz (already clamped ≥ 0)
 */
const updateLeaderboard = async (userId, score) => {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // 1. Fetch latest username (display name may have changed)
      const user = await User.findOne({ userId }).select("username").lean()
      const username = user?.username ?? "Unknown"

      // 2. Upsert: increment totals
      const entry = await Leaderboard.findOneAndUpdate(
        { userId },
        {
          $inc: { totalScore: score, totalQuizzes: 1 },
          $set: { username },
        },
        { upsert: true, returnDocument: "after" }
      )

      // 3. Recalculate avgScore now that totals are updated
      entry.avgScore = entry.totalQuizzes > 0
        ? parseFloat((entry.totalScore / entry.totalQuizzes).toFixed(4))
        : 0
      await entry.save()

      // 4. Re-rank all users: sort by avgScore desc, assign rank = position + 1
      //    Using bulkWrite for atomicity and efficiency
      const allEntries = await Leaderboard.find({})
        .sort({ avgScore: -1, totalQuizzes: -1 }) // tie-break by quiz count
        .select("_id")
        .lean()

      const bulkOps = allEntries.map((e, idx) => ({
        updateOne: {
          filter: { _id: e._id },
          update: { $set: { rank: idx + 1 } },
        },
      }))

      if (bulkOps.length > 0) {
        await Leaderboard.bulkWrite(bulkOps, { ordered: false })
      }

      return // success — exit retry loop
    } catch (err) {
      const isVersionConflict = err.name === "VersionError" || err.code === 11000
      if (isVersionConflict && attempt < MAX_RETRIES - 1) {
        // Small back-off before retry
        await new Promise((r) => setTimeout(r, 100 * (attempt + 1)))
        continue
      }
      // Non-retryable or exhausted retries — log and let fire-and-forget caller handle
      throw err
    }
  }
}

module.exports = { updateLeaderboard }
