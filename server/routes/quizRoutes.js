const express = require("express")
const router = express.Router()
const { protect } = require("../middleware/auth")
const {
  initQuiz,
  getQuestions,
  submitQuiz,
  getResult,
  report,
} = require("../controllers/quizController")

// All quiz routes require authentication
router.use(protect)

router.post("/init",                    initQuiz)
router.get( "/questions/:attemptId",    getQuestions)
router.post("/submit",                  submitQuiz)
router.get( "/result/:attemptId",       getResult)
router.get( "/report/:attemptId",       report)

module.exports = router
