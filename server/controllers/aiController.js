const Joi = require("joi")
const asyncHandler = require("../middleware/asyncHandler")
const groq = require("../utils/groqClient")
const Question = require("../models/Question")
const { decrypt } = require("../utils/crypto")

// ── Joi schema for generate ───────────────────────────────────────────────────
const generateSchema = Joi.object({
  topic:        Joi.string().min(3).max(200).required(),
  difficulty:   Joi.string().valid("easy", "medium", "hard").required(),
  count:        Joi.number().integer().min(5).max(20).default(5),
  categorySlug: Joi.string().required(),
})

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Strip markdown code fences (```json ... ```) that Groq sometimes wraps around output.
 * Also strips any leading/trailing whitespace.
 */
const stripFences = (text) => {
  // Remove ```json ... ``` or ``` ... ``` blocks
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  return fenceMatch ? fenceMatch[1].trim() : text.trim()
}

/**
 * Validate that parsed data is a non-empty array of well-formed MCQ objects.
 * Returns { valid: true } or { valid: false, reason: string }
 */
const validateQuestions = (parsed, expectedCount) => {
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return { valid: false, reason: "Response is not a non-empty array" }
  }

  for (let i = 0; i < parsed.length; i++) {
    const q = parsed[i]
    if (!q.questionText || typeof q.questionText !== "string") {
      return { valid: false, reason: `Item[${i}] missing questionText` }
    }
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      return { valid: false, reason: `Item[${i}] options must be an array of exactly 4 items` }
    }
    for (const opt of q.options) {
      if (!opt.key || !opt.text) {
        return { valid: false, reason: `Item[${i}] each option must have key and text` }
      }
    }
    if (!q.answer || !["A", "B", "C", "D"].includes(q.answer.toUpperCase())) {
      return { valid: false, reason: `Item[${i}] answer must be A, B, C, or D` }
    }
    if (typeof q.explanation !== "string") {
      return { valid: false, reason: `Item[${i}] explanation must be a string` }
    }
  }

  return { valid: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/ai/generate   (protect + requireRole("teacher"))
// ─────────────────────────────────────────────────────────────────────────────
exports.generate = asyncHandler(async (req, res) => {
  // ── Validate input ──────────────────────────────────────────────────────────
  const { error, value } = generateSchema.validate(req.body, { abortEarly: false })
  if (error) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      details: error.details.map((d) => d.message),
    })
  }

  const { topic, difficulty, count, categorySlug } = value

  // ── Build prompt ────────────────────────────────────────────────────────────
  const prompt = `Generate exactly ${count} multiple-choice quiz questions on the topic: "${topic}".
Difficulty level: ${difficulty}.

Rules:
- Each question must have exactly 4 answer options with keys A, B, C, D.
- Exactly one option is correct.
- The "answer" field contains the key of the correct option (e.g. "B").
- Include a clear, concise explanation for the correct answer.
- No duplicate questions.
- Do NOT include any extra text, markdown, or code fences.

Respond with ONLY a valid JSON array in this exact format:
[
  {
    "questionText": "Your question here?",
    "options": [
      { "key": "A", "text": "Option A text" },
      { "key": "B", "text": "Option B text" },
      { "key": "C", "text": "Option C text" },
      { "key": "D", "text": "Option D text" }
    ],
    "answer": "A",
    "explanation": "Explanation of why A is correct."
  }
]`

  // ── Call Groq API ───────────────────────────────────────────────────────────
  let rawText
  try {
    const completion = await groq.chat.completions.create({
      model:       "llama-3.3-70b-versatile",
      messages:    [{ role: "user", content: prompt }],
      temperature: 0.7,
    })
    rawText = completion.choices?.[0]?.message?.content ?? ""
  } catch (err) {
    console.error("Groq API error:", err.message)
    return res.status(503).json({
      success: false,
      message: "AI service unavailable. Please try again later.",
    })
  }

  // ── Safe parse ──────────────────────────────────────────────────────────────
  let parsed
  try {
    const cleaned = stripFences(rawText)
    parsed = JSON.parse(cleaned)
  } catch {
    console.error("Failed to parse Groq response:", rawText)
    return res.status(500).json({
      success: false,
      message: "AI returned an invalid JSON response. Please try again.",
      raw: process.env.NODE_ENV === "development" ? rawText : undefined,
    })
  }

  // ── Validate structure ──────────────────────────────────────────────────────
  const { valid, reason } = validateQuestions(parsed, count)
  if (!valid) {
    console.error("Groq response failed format check:", reason)
    return res.status(422).json({
      success: false,
      message: `AI response has an unexpected format: ${reason}. Please try again.`,
    })
  }

  // Normalise answer to uppercase and attach categorySlug for the frontend
  const questions = parsed.map((q) => ({
    questionText: q.questionText.trim(),
    options:      q.options.map((o) => ({ key: o.key.toUpperCase(), text: o.text.trim() })),
    answer:       q.answer.toUpperCase(),       // plain letter — NOT encrypted here
    explanation:  q.explanation.trim(),
    categorySlug,                               // echoed back so frontend can POST directly to B7
    difficulty,
  }))

  // ── Return to frontend for review — nothing written to DB ───────────────────
  res.status(200).json({
    success: true,
    message: `${questions.length} questions generated. Review and save via POST /api/v1/teacher/questions.`,
    data: questions,
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/v1/ai/explain/:questionId   (protect + requireRole("teacher"))
// Generates an AI explanation for an existing saved question and persists it.
// ─────────────────────────────────────────────────────────────────────────────
exports.explain = asyncHandler(async (req, res) => {
  // 1. Find question by _id
  const question = await Question.findById(req.params.questionId)
  if (!question || !question.active) {
    return res.status(404).json({ success: false, message: "Question not found" })
  }

  // 2. Decrypt the correct answer key
  let decryptedAnswer
  try {
    decryptedAnswer = decrypt(question.answerEncrypted, question.answerIV, question.answerAuthTag)
  } catch {
    return res.status(500).json({ success: false, message: "Failed to read question answer" })
  }

  // 3. Build prompt (B10 spec)
  const prompt = `Question: ${question.questionText}
Correct Answer: ${decryptedAnswer}
Provide a clear, concise explanation of why this is correct.
Return only plain text — no JSON, no markdown.`

  // 4. Call Groq
  let explanation
  try {
    const completion = await groq.chat.completions.create({
      model:       "llama-3.3-70b-versatile",
      messages:    [{ role: "user", content: prompt }],
      temperature: 0.5,
    })
    explanation = completion.choices?.[0]?.message?.content?.trim() ?? ""
  } catch (err) {
    console.error("Groq explain error:", err.message)
    return res.status(503).json({ success: false, message: "AI service unavailable." })
  }

  // 5. Guard against empty response
  if (!explanation) {
    return res.status(500).json({ success: false, message: "AI returned empty explanation" })
  }

  // 6. Persist and return
  question.explanation = explanation
  await question.save()

  res.status(200).json({ success: true, data: { explanation } })
})

