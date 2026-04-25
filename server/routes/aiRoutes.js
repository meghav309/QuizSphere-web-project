const express = require("express")
const router = express.Router()
const { protect, requireRole } = require("../middleware/auth")
const { generate, explain } = require("../controllers/aiController")

// All AI routes are teacher-only
const teacherOnly = [protect, requireRole("teacher")]

// POST /api/v1/ai/generate          — AI generates questions, returns for review
// PATCH /api/v1/ai/explain/:questionId — AI re-generates explanation for existing question
router.post("/generate",               teacherOnly, generate)
router.patch("/explain/:questionId",   teacherOnly, explain)

module.exports = router
