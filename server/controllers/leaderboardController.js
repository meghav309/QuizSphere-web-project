const asyncHandler = require("../middleware/asyncHandler")
const Leaderboard = require("../models/Leaderboard")

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/leaderboard   — public, no auth needed
// Query: ?limit=20
// ─────────────────────────────────────────────────────────────────────────────
exports.getLeaderboard = asyncHandler(async (req, res) => {
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20))

  const data = await Leaderboard.find({ totalQuizzes: { $gt: 0 } })
    .sort({ rank: 1 })
    .limit(limit)
    .select("rank username avgScore totalQuizzes userId -_id")
    .lean()

  res.status(200).json({ success: true, data })
})
