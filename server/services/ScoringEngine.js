/**
 * services/ScoringEngine.js
 * Pure, stateless scoring — no DB calls, fully unit-testable.
 * Scoring rules:
 *   Correct  → +1
 *   Skipped  → 0   (selected is null or empty string)
 *   Wrong    → -0.25  (negative marking)
 *   Final score is clamped to minimum 0.
 */
const { decrypt } = require("../utils/crypto")

const CORRECT_POINTS = 1
const WRONG_PENALTY  = 0.25

/**
 * Evaluate a set of responses against their questions.
 *
 * @param {Array<{ questionId: string, selected: string|null }>} responses
 * @param {Array<mongoose.Document>} questions  — must include answerEncrypted/IV/AuthTag
 * @returns {{ score: number, correctCount: number, wrongCount: number, total: number }}
 */
const evaluate = (responses, questions) => {
  // Build O(1) lookup: questionUUID → question document
  const questionMap = new Map([
  ...questions.map((q) => [q.questionUUID, q]),
  ...questions.map((q) => [q._id.toString(), q]),
])

  let rawScore    = 0
  let correctCount = 0
  let wrongCount   = 0

  for (const { questionId, selected } of responses) {
    const question = questionMap.get(questionId)
    if (!question) continue // orphaned response — skip silently

    const correctAnswer   = decrypt(question.answerEncrypted, question.answerIV, question.answerAuthTag)
    const trimmedSelected = selected ? selected.trim().toUpperCase() : null

    if (trimmedSelected === correctAnswer) {
      rawScore += CORRECT_POINTS
      correctCount++
    } else if (!trimmedSelected) {
      // Skipped — no penalty
    } else {
      rawScore -= WRONG_PENALTY
      wrongCount++
    }
  }

  return {
    score:        Math.max(0, rawScore), // clamp to minimum 0
    correctCount,
    wrongCount,
    total:        questions.length,
  }
}

module.exports = { evaluate }
