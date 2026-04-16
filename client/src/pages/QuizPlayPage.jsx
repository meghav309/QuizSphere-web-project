import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FiArrowLeft, FiArrowRight, FiClock } from 'react-icons/fi'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import QuestionPalette from '../components/QuestionPalette'
import LoadingSpinner from '../components/LoadingSpinner'
import styles from '../styles/quiz.module.css'
import { fetchQuestionsRequest, submitQuizRequest } from '../services/quizService'

const formatTime = (secondsLeft) => {
  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const QuizPlayPage = () => {
  const { quizId } = useParams()
  const navigate = useNavigate()
  const [quiz, setQuiz] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [visited, setVisited] = useState(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const hasSubmitted = useRef(false)

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        setIsLoading(true)
        const payload = await fetchQuestionsRequest(quizId)
        setQuiz(payload.quiz)
        setQuestions(payload.questions)
        setSecondsLeft(payload.quiz.timerEnabled ? payload.questions.length * 45 : 0)
      } catch (error) {
        toast.error(error.response?.data?.message || 'Unable to load quiz questions.')
        navigate('/dashboard')
      } finally {
        setIsLoading(false)
      }
    }

    loadQuestions()
  }, [navigate, quizId])

  useEffect(() => {
    if (!questions[currentIndex]) {
      return
    }

    setVisited((current) => {
      const next = new Set(current)
      next.add(questions[currentIndex].id)
      return next
    })
  }, [currentIndex, questions])

  const submitQuiz = useCallback(async () => {
    if (!quiz || hasSubmitted.current) {
      return
    }

    try {
      hasSubmitted.current = true
      setIsSubmitting(true)
      const result = await submitQuizRequest({
        quizId: quiz.id,
        answers,
      })

      const payload = {
        ...result,
        answeredCount: Object.keys(answers).length,
        elapsedLabel: quiz.timerEnabled ? formatTime(secondsLeft) : 'Practice mode',
      }

      sessionStorage.setItem('quizsphere_result', JSON.stringify(payload))
      navigate('/results', { replace: true, state: payload })
    } catch (error) {
      hasSubmitted.current = false
      toast.error(error.response?.data?.message || 'Unable to submit quiz.')
    } finally {
      setIsSubmitting(false)
    }
  }, [answers, navigate, quiz, secondsLeft])

  useEffect(() => {
    if (!quiz?.timerEnabled || !secondsLeft || hasSubmitted.current) {
      return
    }

    const interval = window.setInterval(() => {
      setSecondsLeft((current) => current - 1)
    }, 1000)

    return () => window.clearInterval(interval)
  }, [quiz?.timerEnabled, secondsLeft])

  useEffect(() => {
    if (quiz?.timerEnabled && secondsLeft === 0 && questions.length && !hasSubmitted.current) {
      toast.info('Time is over. Submitting your test now.')
      submitQuiz()
    }
  }, [questions.length, quiz?.timerEnabled, secondsLeft, submitQuiz])

  const sections = useMemo(
    () => [...new Set(questions.map((question) => question.section))],
    [questions],
  )

  const currentQuestion = questions[currentIndex]

  if (isLoading) {
    return <LoadingSpinner fullScreen label="Preparing your quiz experience..." />
  }

  if (!currentQuestion) {
    return (
      <div className={styles.emptyState}>
        <h2>No questions available</h2>
        <p>Add questions for this quiz from the backend seed or create another quiz to continue.</p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.topActions}>
        <div className={styles.tabList}>
          {sections.map((section) => (
            <button
              key={section}
              type="button"
              className={`${styles.sectionTab} ${
                currentQuestion.section === section ? styles.sectionTabActive : ''
              }`}
              onClick={() =>
                setCurrentIndex(questions.findIndex((question) => question.section === section))
              }
            >
              {section}
            </button>
          ))}
        </div>

        <button type="button" className={styles.submitButton} onClick={submitQuiz} disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit Test'}
        </button>
      </div>

      <div className={styles.layout}>
        <div className={styles.mainCard}>
          <div className={styles.questionHeader}>
            <div>
              <p className={styles.sectionLabel}>Question {currentIndex + 1}</p>
              <h2>{quiz.title}</h2>
            </div>
            <button type="button" className={styles.backButton} onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </button>
          </div>

          <div className={styles.questionCard}>
            <p className={styles.prompt}>{currentQuestion.prompt}</p>

            <div className={styles.options}>
              {currentQuestion.options.map((option) => (
                <label key={option} className={styles.option}>
                  <input
                    type="radio"
                    name={currentQuestion.id}
                    checked={answers[currentQuestion.id] === option}
                    onChange={() =>
                      setAnswers((current) => ({
                        ...current,
                        [currentQuestion.id]: option,
                      }))
                    }
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>

            <div className={styles.navActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setCurrentIndex((value) => Math.max(0, value - 1))}
                disabled={currentIndex === 0}
              >
                <FiArrowLeft />
                <span>Previous Question</span>
              </button>

              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => setCurrentIndex((value) => Math.min(questions.length - 1, value + 1))}
                disabled={currentIndex === questions.length - 1}
              >
                <span>Next Question</span>
                <FiArrowRight />
              </button>
            </div>
          </div>

          <QuestionPalette
            questions={questions}
            answers={answers}
            currentId={currentQuestion.id}
            visited={visited}
            onSelect={setCurrentIndex}
          />
        </div>

        <aside className={styles.sidebar}>
          <div className={styles.timerCard}>
            <div className={styles.timerIcon}>
              <FiClock />
            </div>
            <p>Countdown Timer</p>
            <strong>{quiz.timerEnabled ? formatTime(Math.max(secondsLeft, 0)) : 'Practice Mode'}</strong>
            <span>{Object.keys(answers).length} of {questions.length} answered</span>
          </div>

          <div className={styles.summaryCard}>
            <h3>Quiz Summary</h3>
            <p>{quiz.category}</p>
            <strong>{quiz.questionsCount} questions</strong>
            <span>Minimum score: {quiz.minPoints}%</span>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default QuizPlayPage
