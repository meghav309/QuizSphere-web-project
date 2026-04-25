const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const User = require("../models/User")
const asyncHandler = require("../middleware/asyncHandler")
const { generateAccessToken, generateRefreshToken } = require("../utils/generateToken")
const { setRefreshCookie } = require("../middleware/auth")

// ── Shared: safe user payload sent to client ──────────────────────────────────
const safeUser = (u) => ({
  userId: u.userId,
  username: u.username,
  email: u.email,
  role: u.role,
  totalQuizzes: u.totalQuizzes,
  totalScore: u.totalScore,
  badges: u.badges,
})

// ── Shared: issue both tokens, persist refresh hash, set cookie ───────────────
const issueTokens = async (res, user) => {
  const accessToken = generateAccessToken(user.userId, user.role)
  const refreshToken = generateRefreshToken(user.userId)

  // bcrypt-hash the refresh token before persisting
  user.refreshTokenHash = await bcrypt.hash(refreshToken, 10)
  await user.save({ validateBeforeSave: false })

  setRefreshCookie(res, refreshToken)
  return accessToken
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/auth/register
// ─────────────────────────────────────────────────────────────────────────────
exports.register = asyncHandler(async (req, res, next) => {
  const { username, email, password } = req.body

  // Basic validation
  if (!username || username.trim().length < 3) {
    return res.status(400).json({ success: false, message: "Username must be at least 3 characters" })
  }
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ success: false, message: "Valid email is required" })
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ success: false, message: "Password must be at least 6 characters" })
  }

  // Uniqueness check
  const exists = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username }] })
  if (exists) {
    return res.status(409).json({
      success: false,
      message: exists.email === email.toLowerCase() ? "Email already registered" : "Username already taken",
    })
  }

  const user = await User.create({ username, email, passwordHash: password })
  const accessToken = await issueTokens(res, user)

  res.status(201).json({ success: true, accessToken, user: safeUser(user) })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/auth/register-teacher
// ─────────────────────────────────────────────────────────────────────────────
exports.registerTeacher = asyncHandler(async (req, res, next) => {
  const { username, email, password, teacherCode } = req.body

  // Validate teacher code first
  if (!teacherCode || teacherCode !== process.env.TEACHER_CODE) {
    return res.status(403).json({ success: false, message: "Invalid teacher registration code" })
  }

  if (!username || username.trim().length < 3) {
    return res.status(400).json({ success: false, message: "Username must be at least 3 characters" })
  }
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ success: false, message: "Valid email is required" })
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ success: false, message: "Password must be at least 6 characters" })
  }

  const exists = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username }] })
  if (exists) {
    return res.status(409).json({
      success: false,
      message: exists.email === email.toLowerCase() ? "Email already registered" : "Username already taken",
    })
  }

  const user = await User.create({ username, email, passwordHash: password, role: "teacher" })
  const accessToken = await issueTokens(res, user)

  res.status(201).json({ success: true, accessToken, user: safeUser(user) })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/auth/login
// ─────────────────────────────────────────────────────────────────────────────
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required" })
  }

  // Fetch with passwordHash for comparison
  const user = await User.findOne({ email: email.toLowerCase() })
  if (!user) {
    return res.status(401).json({ success: false, message: "Invalid credentials" })
  }

  const isMatch = await user.comparePassword(password)
  if (!isMatch) {
    return res.status(401).json({ success: false, message: "Invalid credentials" })
  }

  const accessToken = await issueTokens(res, user)

  res.status(200).json({ success: true, accessToken, user: safeUser(user) })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/auth/refresh  (no protect needed — uses cookie)
// ─────────────────────────────────────────────────────────────────────────────
exports.refresh = asyncHandler(async (req, res, next) => {
  const token = req.cookies.__refreshToken

  if (!token) {
    return res.status(401).json({ success: false, message: "No refresh token provided" })
  }

  let decoded
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET)
  } catch {
    return res.status(401).json({ success: false, message: "Refresh token invalid or expired" })
  }

  const user = await User.findOne({ userId: decoded.userId })
  if (!user) {
    return res.status(401).json({ success: false, message: "User not found" })
  }

  const isValid = await user.compareRefreshToken(token)
  if (!isValid) {
    // Token reuse detected — clear stored token
    user.refreshTokenHash = null
    await user.save({ validateBeforeSave: false })
    return res.status(401).json({ success: false, message: "Refresh token mismatch — please log in again" })
  }

  // Rotate: issue a brand new pair
  const newAccessToken = await issueTokens(res, user)

  res.status(200).json({ success: true, accessToken: newAccessToken })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/auth/logout   (protect required)
// ─────────────────────────────────────────────────────────────────────────────
exports.logout = asyncHandler(async (req, res, next) => {
  // req.user is the lean doc without passwordHash; fetch full doc to save
  const user = await User.findOne({ userId: req.user.userId })
  if (user) {
    user.refreshTokenHash = null
    await user.save({ validateBeforeSave: false })
  }

  res.clearCookie("__refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  })

  res.status(200).json({ success: true, message: "Logged out successfully" })
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/auth/me   (protect required)
// ─────────────────────────────────────────────────────────────────────────────
exports.me = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, user: req.user })
})
