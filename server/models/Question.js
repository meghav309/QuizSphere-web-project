const mongoose = require("mongoose")
const { v4: uuidv4 } = require("uuid")

const questionSchema = new mongoose.Schema(
  {
    questionUUID: {
      type: String,
      default: () => uuidv4(),
      unique: true,
      index: true,
    },
    categorySlug: {
      type: String,
      required: [true, "categorySlug is required"],
      index: true,
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      required: [true, "difficulty is required"],
    },
    questionText: {
      type: String,
      required: [true, "questionText is required"],
      trim: true,
    },
    // e.g. [{ key: "A", text: "Paris" }, { key: "B", text: "London" }, ...]
    options: [
      {
        key: { type: String, required: true },   // "A" | "B" | "C" | "D"
        text: { type: String, required: true },
      },
    ],
    // AES-256-GCM encrypted answer key (stores ONLY the letter, e.g. "A")
    answerEncrypted: { type: String, required: true },
    answerIV:        { type: String, required: true },
    answerAuthTag:   { type: String, required: true },
    explanation: {
      type: String,
      default: "",
      trim: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    // "ai" for AI-generated questions; teacher's userId for manual questions
    createdByTeacher: {
      type: String,
      default: "ai",
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model("Question", questionSchema)
