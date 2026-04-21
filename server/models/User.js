const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")
const { v4: uuidv4 } = require("uuid")

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      default: () => uuidv4(),
      unique: true,
      index: true,
    },
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    passwordHash: {
      type: String,
      required: [true, "Password is required"],
    },
    role: {
      type: String,
      enum: ["student", "teacher"],
      default: "student",
    },
    // Stores bcrypt hash of the current refresh token
    refreshTokenHash: {
      type: String,
      default: null,
    },
    totalQuizzes: {
      type: Number,
      default: 0,
    },
    totalScore: {
      type: Number,
      default: 0,
    },
    badges: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
)

// ── Pre-save: hash password whenever it changes ──────────────────────────────
userSchema.pre("save", async function () {
  if (!this.isModified("passwordHash")) return
  this.passwordHash = await bcrypt.hash(this.passwordHash, 10)
})

// ── Instance method: compare plain password vs stored hash ───────────────────
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.passwordHash)
}

// ── Instance method: compare plain refresh token vs stored hash ──────────────
userSchema.methods.compareRefreshToken = async function (token) {
  if (!this.refreshTokenHash) return false
  return bcrypt.compare(token, this.refreshTokenHash)
}

module.exports = mongoose.model("User", userSchema)
