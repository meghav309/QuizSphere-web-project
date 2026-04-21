const asyncHandler = require("../middleware/asyncHandler")
const QuizAttempt = require("../models/QuizAttempt")

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/analytics/me   (protect required)
// ─────────────────────────────────────────────────────────────────────────────
exports.getMyAnalytics = asyncHandler(async (req, res) => {
  const userId = req.user.userId
  const baseMatch = { $match: { userId, status: "submitted" } }

  // Run all three aggregation pipelines concurrently
  const [basicStats, rawTrend, categoryPerformance] = await Promise.all([

    // ── Pipeline 1: Basic stats ──────────────────────────────────────────────
    QuizAttempt.aggregate([
      baseMatch,
      {
        $group: {
          _id:           null,
          avgScore:      { $avg: "$score" },
          totalAttempts: { $sum: 1 },
        },
      },
    ]),

    // ── Pipeline 2: Accuracy trend (last 10, oldest-first for Recharts) ──────
    QuizAttempt.aggregate([
      baseMatch,
      { $sort:    { createdAt: -1 } },
      { $limit:   10 },
      { $project: { _id: 0, score: 1, createdAt: 1, categorySlug: 1 } },
    ]),

    // ── Pipeline 3: Per-category average score ───────────────────────────────
    QuizAttempt.aggregate([
      baseMatch,
      {
        $group: {
          _id:      "$categorySlug",
          avgScore: { $avg: "$score" },
          count:    { $sum: 1 },
        },
      },
      { $sort: { avgScore: -1 } },
    ]),
  ])

  // ── Edge case: no attempts yet ────────────────────────────────────────────
  if (!basicStats.length) {
    return res.status(200).json({
      success: true,
      data: {
        avgScore:            0,
        totalAttempts:       0,
        accuracyTrend:       [],
        categoryPerformance: [],
      },
    })
  }

  const { avgScore, totalAttempts } = basicStats[0]

  // Reverse trend array so it runs oldest → newest (Recharts LineChart order)
  const accuracyTrend = rawTrend.reverse()

  res.status(200).json({
    success: true,
    data: {
      avgScore:            parseFloat(avgScore.toFixed(2)),
      totalAttempts,
      accuracyTrend,       // [{ score, createdAt, categorySlug }]
      categoryPerformance, // [{ _id: "slug", avgScore, count }]
    },
  })
})
