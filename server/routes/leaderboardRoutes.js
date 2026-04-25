const express = require("express")
const router = express.Router()
const { getLeaderboard } = require("../controllers/leaderboardController")

// Public — no protect middleware
router.get("/", getLeaderboard)

module.exports = router
