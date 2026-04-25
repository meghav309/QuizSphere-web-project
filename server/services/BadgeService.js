/**
 * services/BadgeService.js
 * Checks badge eligibility and awards new badges to a user.
 * Always called fire-and-forget so it never blocks a response:
 *
 *   BadgeService.checkAndAwardBadges(userId)
 *     .catch(err => console.error("Badge error:", err))
 */
const User = require("../models/User")

// ── Badge rule definitions ────────────────────────────────────────────────────
// Each rule: { badge, condition(user) → boolean }
const BADGE_RULES = [
  {
    badge: "Beginner",
    condition: (u) => u.totalQuizzes >= 3,
  },
  {
    badge: "Veteran",
    condition: (u) => u.totalQuizzes >= 10,
  },
  {
    badge: "Expert",
    // average score > 80 % (each quiz is worth 5 points max)
    condition: (u) =>
      u.totalQuizzes > 0 && u.totalScore / u.totalQuizzes > 4, // 4/5 = 80 %
  },
]

/**
 * Evaluate badge rules for a user and persist any newly earned badges.
 *
 * @param {string} userId  — the user's UUID (not MongoDB _id)
 * @returns {Promise<string[]>}  — array of badge names newly awarded
 */
const checkAndAwardBadges = async (userId) => {
  const user = await User.findOne({ userId })
  if (!user) return []

  const newBadges = []

  for (const { badge, condition } of BADGE_RULES) {
    if (!user.badges.includes(badge) && condition(user)) {
      user.badges.push(badge)
      newBadges.push(badge)
    }
  }

  if (newBadges.length > 0) {
    await user.save({ validateBeforeSave: false })
  }

  return newBadges
}

module.exports = { checkAndAwardBadges }
