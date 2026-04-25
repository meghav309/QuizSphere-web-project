require("dotenv").config()
const express = require("express")
const cors = require("cors")
const morgan = require("morgan")
const helmet = require("helmet")
const hpp = require("hpp")
const rateLimit = require("express-rate-limit")
const cookieParser = require("cookie-parser")

const connectDB = require("./config/db")
const errorHandler = require("./middleware/errorHandler")
const notFound = require("./middleware/notFound")

// ── Connect to MongoDB ─────────────────────────────────────────────────────────
connectDB()

// ── Background Workers ───────────────────────────────────────────────────────
require("./workers/cleanup")()

const app = express()

// ── Security Middleware ────────────────────────────────────────────────────────
app.use(helmet())
app.use(hpp())
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
)
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests, please try again later." },
  })
)

// ── Parsing Middleware ─────────────────────────────────────────────────────────
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(morgan("dev"))

// ── Health Check ──────────────────────────────────────────────────────────────
app.get("/api/v1/health", (req, res) =>
  res.json({ success: true, message: "Server running" })
)

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/v1/auth",        require("./routes/authRoutes"))
app.use("/api/v1/quiz",        require("./routes/quizRoutes"))
app.use("/api/v1/categories",  require("./routes/categoryRoutes"))
app.use("/api/v1/teacher",     require("./routes/teacherRoutes"))
app.use("/api/v1/ai",          require("./routes/aiRoutes"))
app.use("/api/v1/analytics",   require("./routes/analyticsRoutes"))
app.use("/api/v1/leaderboard", require("./routes/leaderboardRoutes"))

// ── Error Handling (must be last) ─────────────────────────────────────────────
app.use(notFound)
app.use(errorHandler)

// ── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
