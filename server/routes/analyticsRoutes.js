const express = require("express")
const router = express.Router()
const { protect } = require("../middleware/auth")
const { getMyAnalytics } = require("../controllers/analyticsController")

// GET /api/v1/analytics/me — student fetches their own analytics
router.get("/me", protect, getMyAnalytics)

module.exports = router
