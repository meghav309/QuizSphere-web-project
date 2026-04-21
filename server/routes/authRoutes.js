const express = require("express")
const router = express.Router()
const rateLimit = require("express-rate-limit")
const {
  register,
  registerTeacher,
  login,
  refresh,
  logout,
  me,
} = require("../controllers/authController")
const { protect } = require("../middleware/auth")

// Stricter rate limit for auth mutation endpoints (10 req / 15 min)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts. Please try again in 15 minutes." },
})

// Public routes
router.post("/register",          authLimiter, register)
router.post("/register-teacher",  authLimiter, registerTeacher)
router.post("/login",             authLimiter, login)
router.post("/refresh",           refresh)   // uses __refreshToken cookie — no Bearer needed

// Protected routes
router.post("/logout", protect, logout)
router.get("/me",      protect, me)

module.exports = router
