const jwt = require("jsonwebtoken")
const asyncHandler = require("./asyncHandler")
const User = require("../models/User")

// ── Cookie helper ─────────────────────────────────────────────────────────────
/**
 * Set the __refreshToken HttpOnly cookie on the response
 */
const setRefreshCookie = (res, token) => {
  res.cookie("__refreshToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  })
}

/**
 * protect — verifies Bearer access token, attaches req.user
 */
const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization
  const token =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null

  if (!token) {
    const err = new Error("Not authorized — no token provided")
    err.statusCode = 401
    return next(err)
  }

  let decoded
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    const err = new Error("Token invalid or expired")
    err.statusCode = 401
    return next(err)
  }

  const user = await User.findOne({ userId: decoded.userId }).select(
    "-passwordHash -refreshTokenHash"
  )

  if (!user) {
    const err = new Error("User belonging to this token no longer exists")
    err.statusCode = 401
    return next(err)
  }

  req.user = user
  next()
})

/**
 * requireRole — checks req.user.role matches the required role
 * Usage: router.get("/path", protect, requireRole("teacher"), handler)
 */
const requireRole = (role) => (req, res, next) => {
  if (req.user.role !== role) {
    const err = new Error(
      `Access denied — requires role '${role}', you are '${req.user.role}'`
    )
    err.statusCode = 403
    return next(err)
  }
  next()
}

module.exports = { protect, requireRole, setRefreshCookie }
