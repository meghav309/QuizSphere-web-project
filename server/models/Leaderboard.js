const mongoose = require("mongoose")

const leaderboardSchema = new mongoose.Schema(
  {
    userId: {
      type:     String,
      required: true,
      unique:   true,
      index:    true,
    },
    username: {
      type: String,
      default: "",
    },
    totalScore: {
      type:    Number,
      default: 0,
    },
    totalQuizzes: {
      type:    Number,
      default: 0,
    },
    avgScore: {
      type:    Number,
      default: 0,
    },
    rank: {
      type:    Number,
      default: 0,
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model("Leaderboard", leaderboardSchema)
