const asyncHandler   = require("../middleware/asyncHandler")
const QuizAttempt    = require("../models/QuizAttempt")
const Question       = require("../models/Question")
const { generateReport } = require("../services/pdfService")
const {
  initQuiz,
  getQuestions,
  submitQuiz,
  getResult,
} = require("../services/quizService")

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/quiz/init
// ─────────────────────────────────────────────────────────────────────────────
exports.initQuiz = asyncHandler(async (req, res) => {
  const { categorySlug, difficulty } = req.body

  if (!categorySlug || !difficulty) {
    return res.status(400).json({
      success: false,
      message: "categorySlug and difficulty are required",
    })
  }

  const data = await initQuiz({
    userId: req.user.userId,
    categorySlug,
    difficulty,
  })

  res.status(201).json({ success: true, data })
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/quiz/questions/:attemptId
// ─────────────────────────────────────────────────────────────────────────────
exports.getQuestions = asyncHandler(async (req, res) => {
  const { attemptId } = req.params

  const questions = await getQuestions({
    attemptId,
    userId: req.user.userId,
  })

  res.status(200).json({ success: true, data: questions })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/quiz/submit
// ─────────────────────────────────────────────────────────────────────────────
exports.submitQuiz = asyncHandler(async (req, res) => {
  const { attemptId, responses } = req.body

  if (!attemptId || !Array.isArray(responses)) {
    return res.status(400).json({
      success: false,
      message: "attemptId and responses[] are required",
    })
  }

  const data = await submitQuiz({
    attemptId,
    userId: req.user.userId,
    responses,
  })

  res.status(200).json({ success: true, data })
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/quiz/result/:attemptId
// ─────────────────────────────────────────────────────────────────────────────
exports.getResult = asyncHandler(async (req, res) => {
  const { attemptId } = req.params

  const data = await getResult({
    attemptId,
    userId: req.user.userId,
  })

  res.status(200).json({ success: true, data })
})

// ───────────────────────────────────────────────────────────────────────────────
// GET /api/v1/quiz/report/:attemptId
// ───────────────────────────────────────────────────────────────────────────────
exports.report = asyncHandler(async (req, res) => {
  const { attemptId } = req.params

  // 1. Ownership + completion check in one query
  const attempt = await QuizAttempt.findOne({
    attemptId,
    userId:  req.user.userId,
    status:  "submitted",
  })

  if (!attempt) {
    return res.status(404).json({
      success: false,
      message: "Submitted attempt not found — complete the quiz before downloading the report",
    })
  }

  // 2. Fetch the full questions (with answer fields) preserved in submission order
  const questions = await Question.find({
    questionUUID: { $in: attempt.questionIds },
  })

  // 3. Generate the PDF buffer
  const pdfBuffer = await generateReport(attempt, questions, req.user.username)

  // 4. Stream the PDF to the client
  res.set({
    "Content-Type":        "application/pdf",
    "Content-Disposition": `attachment; filename="quiz-report-${attemptId}.pdf"`,
    "Content-Length":      pdfBuffer.length,
  })

  res.end(pdfBuffer)
})
