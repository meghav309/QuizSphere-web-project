const jwt = require("jsonwebtoken")

/**
 * Generate a short-lived access token (default 15m)
 * @param {string} userId  - User's UUID
 * @param {string} role    - "student" | "teacher"
 * @returns {string} signed JWT
 */
const generateAccessToken = (userId, role) =>
  jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRY || "15m",
  })

/**
 * Generate a long-lived refresh token (default 7d)
 * @param {string} userId  - User's UUID
 * @returns {string} signed JWT
 */
const generateRefreshToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRY || "7d",
  })

module.exports = { generateAccessToken, generateRefreshToken }
