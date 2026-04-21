const mongoose = require("mongoose")
const { v4: uuidv4 } = require("uuid")

const quizAttemptSchema = new mongoose.Schema(
  {
    attemptId: {
      type: String,
      default: () => uuidv4(),
      unique: true,
      index: true,
    },
    userId: {
      type: String,
      required: [true, "userId is required"],
      index: true,
    },
    // one-time token handed to the client so the frontend can poll
    sessionToken: {
      type: String,
      unique: true,
      sparse: true, // allow null while still enforcing uniqueness when set
    },
    categorySlug: {
      type: String,
      required: [true, "categorySlug is required"],
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      required: [true, "difficulty is required"],
    },
    // questionUUIDs stored after getQuestions is called
    questionIds: {
      type: [String],
      default: [],
    },
    // raw responses saved at submit time
    responses: [
      {
        questionId: { type: String, required: true }, // questionUUID
        selected:   { type: String, default: null },  // "A" | "B" | "C" | "D" | null
      },
    ],
    score:        { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    wrongCount:   { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["in-progress", "submitted"],
      default: "in-progress",
    },
    recommendation: { type: String, default: "" },
  },
  { timestamps: true }
)

module.exports = mongoose.model("QuizAttempt", quizAttemptSchema)
