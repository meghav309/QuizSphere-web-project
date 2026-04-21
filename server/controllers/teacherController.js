const asyncHandler = require("../middleware/asyncHandler")
const Question = require("../models/Question")
const { encrypt } = require("../utils/crypto")

// ── Shared: safe projection (strip answer fields before sending to client) ────
const SAFE_PROJECTION = "-answerEncrypted -answerIV -answerAuthTag"

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/teacher/questions
// Query: ?search=&category=&difficulty=&page=1&limit=10
// ─────────────────────────────────────────────────────────────────────────────
exports.listQuestions = asyncHandler(async (req, res) => {
  const {
    search,
    category,
    difficulty,
    page  = "1",
    limit = "10",
  } = req.query

  const pageNum  = Math.max(1, parseInt(page,  10) || 1)
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10))

  // Build filter — always restrict to active questions
  const filter = { active: true }

  if (search)    filter.questionText = { $regex: search.trim(), $options: "i" }
  if (category)  filter.categorySlug = category.trim()
  if (difficulty) filter.difficulty  = difficulty.trim()

  const skip  = (pageNum - 1) * limitNum
  const total = await Question.countDocuments(filter)

  const questions = await Question.find(filter)
    .select(SAFE_PROJECTION)
    .skip(skip)
    .limit(limitNum)
    .sort({ createdAt: -1 })
    .lean()

  res.status(200).json({
    success:    true,
    data:       questions,
    total,
    page:       pageNum,
    totalPages: Math.ceil(total / limitNum),
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/teacher/questions
// ─────────────────────────────────────────────────────────────────────────────
exports.createQuestion = asyncHandler(async (req, res) => {
  const {
    questionText,
    options,
    answer,       // plain letter key: "A" | "B" | "C" | "D"
    explanation,
    categorySlug,
    difficulty,
  } = req.body

  // ── Validation ──────────────────────────────────────────────────────────────
  if (!questionText || typeof questionText !== "string" || !questionText.trim()) {
    return res.status(400).json({ success: false, message: "questionText is required" })
  }

  if (!Array.isArray(options) || options.length !== 4) {
    return res.status(400).json({ success: false, message: "options must be an array of exactly 4 items" })
  }

  for (const opt of options) {
    if (!opt.key || !opt.text) {
      return res.status(400).json({ success: false, message: "Each option must have a key and text" })
    }
  }

  const validKeys = ["A", "B", "C", "D"]
  if (!answer || !validKeys.includes(answer.toUpperCase())) {
    return res.status(400).json({ success: false, message: "answer must be one of: A, B, C, D" })
  }

  if (!categorySlug || typeof categorySlug !== "string") {
    return res.status(400).json({ success: false, message: "categorySlug is required" })
  }

  if (!["easy", "medium", "hard"].includes(difficulty)) {
    return res.status(400).json({ success: false, message: "difficulty must be 'easy', 'medium', or 'hard'" })
  }

  // ── Encrypt the answer key ──────────────────────────────────────────────────
  const { encryptedData, iv, authTag } = encrypt(answer.toUpperCase())

  const question = await Question.create({
    questionText:    questionText.trim(),
    options,
    answerEncrypted: encryptedData,
    answerIV:        iv,
    answerAuthTag:   authTag,
    explanation:     explanation?.trim() ?? "",
    categorySlug:    categorySlug.trim(),
    difficulty,
    createdByTeacher: req.user.userId,
  })

  // Return the saved doc without answer fields
  const safeQuestion = await Question.findById(question._id).select(SAFE_PROJECTION).lean()

  res.status(201).json({ success: true, data: safeQuestion })
})

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/v1/teacher/questions/:id
// ─────────────────────────────────────────────────────────────────────────────
exports.updateQuestion = asyncHandler(async (req, res) => {
  const question = await Question.findById(req.params.id)

  if (!question || !question.active) {
    return res.status(404).json({ success: false, message: "Question not found" })
  }

  const {
    questionText,
    options,
    answer,       // optional — only re-encrypt if provided
    explanation,
    categorySlug,
    difficulty,
    active,
  } = req.body

  // Apply updates selectively
  if (questionText !== undefined) question.questionText = questionText.trim()
  if (options      !== undefined) {
    if (!Array.isArray(options) || options.length !== 4) {
      return res.status(400).json({ success: false, message: "options must be an array of exactly 4 items" })
    }
    question.options = options
  }
  if (explanation  !== undefined) question.explanation  = explanation.trim()
  if (categorySlug !== undefined) question.categorySlug = categorySlug.trim()
  if (difficulty   !== undefined) {
    if (!["easy", "medium", "hard"].includes(difficulty)) {
      return res.status(400).json({ success: false, message: "difficulty must be 'easy', 'medium', or 'hard'" })
    }
    question.difficulty = difficulty
  }
  if (active !== undefined) question.active = Boolean(active)

  // Re-encrypt only if a new answer is provided
  if (answer !== undefined) {
    const validKeys = ["A", "B", "C", "D"]
    if (!validKeys.includes(answer.toUpperCase())) {
      return res.status(400).json({ success: false, message: "answer must be one of: A, B, C, D" })
    }
    const { encryptedData, iv, authTag } = encrypt(answer.toUpperCase())
    question.answerEncrypted = encryptedData
    question.answerIV        = iv
    question.answerAuthTag   = authTag
  }

  await question.save()

  const safeQuestion = await Question.findById(question._id).select(SAFE_PROJECTION).lean()

  res.status(200).json({ success: true, data: safeQuestion })
})

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/v1/teacher/questions/:id   (soft delete)
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteQuestion = asyncHandler(async (req, res) => {
  const question = await Question.findById(req.params.id)

  if (!question || !question.active) {
    return res.status(404).json({ success: false, message: "Question not found" })
  }

  question.active = false
  await question.save()

  res.status(200).json({
    success: true,
    message: "Question deactivated successfully",
    data:    { id: question._id, questionUUID: question.questionUUID },
  })
})
