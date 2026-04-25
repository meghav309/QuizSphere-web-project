const express = require("express")
const router = express.Router()
const { protect, requireRole } = require("../middleware/auth")
const {
  listQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
} = require("../controllers/teacherController")

// Apply auth + role guard to ALL routes in this router
router.use(protect, requireRole("teacher"))

// ── Question CRUD ─────────────────────────────────────────────────────────────
// GET    /api/v1/teacher/questions         → paginated list with filters
// POST   /api/v1/teacher/questions         → create new question
// PUT    /api/v1/teacher/questions/:id     → update question (partial)
// DELETE /api/v1/teacher/questions/:id     → soft delete (sets active=false)

router
  .route("/questions")
  .get(listQuestions)
  .post(createQuestion)

router
  .route("/questions/:id")
  .put(updateQuestion)
  .delete(deleteQuestion)

module.exports = router
