/**
 * services/quizService.js
 * All business logic for the quiz engine, keeping the controller thin.
 */
const { v4: uuidv4 } = require("uuid")
const Category = require("../models/Category")
const Question = require("../models/Question")
const QuizAttempt = require("../models/QuizAttempt")
const User = require("../models/User")
const { decrypt } = require("../utils/crypto")
const ScoringEngine = require("./ScoringEngine")
const BadgeService = require("./BadgeService")
const LeaderboardService = require("./leaderboardService")

// ── Constants ─────────────────────────────────────────────────────────────────
const QUESTIONS_PER_QUIZ = 5

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Map a score percentage to a recommendation string */
const buildRecommendation = (score, total) => {
  const pct = total > 0 ? (score / total) * 100 : 0
  if (pct < 40) return "Practice easy questions to strengthen your fundamentals."
  if (pct <= 75) return "Try medium difficulty to keep improving."
  return "Great job! Challenge yourself with hard questions."
}

/** Safely decrypt a question's answer key */
const decryptAnswer = (q) =>
  decrypt(q.answerEncrypted, q.answerIV, q.answerAuthTag)

// ─────────────────────────────────────────────────────────────────────────────
// initQuiz
// ─────────────────────────────────────────────────────────────────────────────
const initQuiz = async ({ userId, categorySlug, difficulty }) => {
  // 1. Validate that the category exists
  const category = await Category.findOne({ slug: categorySlug })
  if (!category) {
    const err = new Error(`Category '${categorySlug}' not found`)
    err.statusCode = 404
    throw err
  }

  // 2. Validate difficulty value (enum check is also on the model, but be explicit here)
  if (!["easy", "medium", "hard"].includes(difficulty)) {
    const err = new Error("difficulty must be 'easy', 'medium', or 'hard'")
    err.statusCode = 400
    throw err
  }

  // 3. Create the attempt
  const attempt = await QuizAttempt.create({
    userId,
    sessionToken: uuidv4(),
    categorySlug,
    difficulty,
  })

  return { attemptId: attempt.attemptId, sessionToken: attempt.sessionToken }
}

// ─────────────────────────────────────────────────────────────────────────────
// getQuestions
// ─────────────────────────────────────────────────────────────────────────────
const getQuestions = async ({ attemptId, userId }) => {
  // 1. Ownership check
  const attempt = await QuizAttempt.findOne({ attemptId, userId })
  if (!attempt) {
    const err = new Error("Attempt not found")
    err.statusCode = 404
    throw err
  }

  if (attempt.status !== "in-progress") {
    const err = new Error("Attempt already submitted")
    err.statusCode = 400
    throw err
  }

  // 2. Fetch questions filtered by categorySlug + difficulty + active
  const questions = await Question.aggregate([
    {
      $match: {
        categorySlug: attempt.categorySlug,
        difficulty: attempt.difficulty,
        active: true,
      },
    },
    { $sample: { size: QUESTIONS_PER_QUIZ } },
    // Strip answer fields from aggregation output
    {
      $project: {
        answerEncrypted: 0,
        answerIV: 0,
        answerAuthTag: 0,
      },
    },
  ])

  if (questions.length === 0) {
    const err = new Error(
      `No active questions found for category '${attempt.categorySlug}' with difficulty '${attempt.difficulty}'`
    )
    err.statusCode = 404
    throw err
  }

  // 3. Persist which questions were served (use questionUUID)
  attempt.questionIds = questions.map((q) => q.questionUUID)
  await attempt.save()

  return questions
}

// ─────────────────────────────────────────────────────────────────────────────
// submitQuiz
// ─────────────────────────────────────────────────────────────────────────────
const submitQuiz = async ({ attemptId, userId, responses }) => {
  // 1. Ownership check
  const attempt = await QuizAttempt.findOne({ attemptId, userId })
  if (!attempt) {
    const err = new Error("Attempt not found")
    err.statusCode = 404
    throw err
  }

  if (attempt.status === "submitted") {
    const err = new Error("Quiz already submitted")
    err.statusCode = 409
    throw err
  }

  // 2. Fetch full questions (with answer fields) for the served question UUIDs
  const questions = await Question.find({
    questionUUID: { $in: attempt.questionIds },
  })

  // 3. Normalise response keys (trim + uppercase) before passing to ScoringEngine
  const normalizedResponses = responses.map(({ questionId, selected }) => ({
    questionId,
    selected: selected ? selected.trim().toUpperCase() : null,
  }))

  // 4. Delegate scoring to the pure ScoringEngine (no DB calls inside)
  const { score, correctCount, wrongCount } = ScoringEngine.evaluate(
    normalizedResponses,
    questions
  )

  // 5. Build recommendation from score percentage
  const recommendation = buildRecommendation(score, QUESTIONS_PER_QUIZ)

  // 6. Persist attempt results
  attempt.responses = normalizedResponses
  attempt.score = score
  attempt.correctCount = correctCount
  attempt.wrongCount = wrongCount
  attempt.status = "submitted"
  attempt.recommendation = recommendation
  await attempt.save()

  // 7. Update user totals atomically
  await User.findOneAndUpdate(
    { userId },
    { $inc: { totalQuizzes: 1, totalScore: score } }
  )

  // 8. Fire-and-forget: badge check + leaderboard update — must not block response
  BadgeService.checkAndAwardBadges(userId).catch((err) =>
    console.error("Badge error:", err.message)
  )

  LeaderboardService.updateLeaderboard(userId, score).catch((err) =>
    console.error("Leaderboard error:", err.message)
  )

  return { attemptId, score, correctCount, wrongCount, recommendation }
}

// ─────────────────────────────────────────────────────────────────────────────
// getResult
// ─────────────────────────────────────────────────────────────────────────────
const getResult = async ({ attemptId, userId }) => {
  const attempt = await QuizAttempt.findOne({ attemptId, userId })
  if (!attempt) {
    const err = new Error("Attempt not found")
    err.statusCode = 404
    throw err
  }

  if (attempt.status !== "submitted") {
    const err = new Error("Quiz not yet submitted")
    err.statusCode = 400
    throw err
  }

  // Fetch full questions with answer fields
  const questions = await Question.find({
    questionUUID: { $in: attempt.questionIds },
  })

  // Build TWO maps — one by questionUUID, one by _id string
  // so we can look up no matter which id was stored in responses
  const mapByUUID = new Map(questions.map((q) => [q.questionUUID, q]))
  const mapById = new Map(questions.map((q) => [q._id.toString(), q]))

  const responsesArray = attempt.responses.map((r) => {
    // Try both maps
    const question = mapByUUID.get(r.questionId) || mapById.get(r.questionId)
    const correctAnswer = question ? decryptAnswer(question) : null

    return {
      questionText: question?.questionText ?? "Question not found",
      options: question?.options ?? [],
      yourAnswer: r.selected,
      correctAnswer,
      explanation: question?.explanation ?? "",
    }
  })

  return {
    score: attempt.score,
    correctCount: attempt.correctCount,
    wrongCount: attempt.wrongCount,
    recommendation: attempt.recommendation,
    responses: responsesArray,
  }
}

module.exports = { initQuiz, getQuestions, submitQuiz, getResult }
