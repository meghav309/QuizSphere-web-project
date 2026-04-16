import { createElement } from 'react'
import { motion } from 'framer-motion'
import { FiBarChart2, FiCheckCircle, FiPlay, FiXCircle } from 'react-icons/fi'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import styles from '../styles/results.module.css'

const ResultsPage = () => {
  const MotionSection = motion.section
  const navigate = useNavigate()
  const location = useLocation()
  const result =
    location.state || JSON.parse(sessionStorage.getItem('quizsphere_result') || 'null')

  if (!result) {
    return <Navigate to="/dashboard" replace />
  }

  const cards = [
    { label: 'Total Questions', value: result.totalQuestions, icon: FiBarChart2 },
    { label: 'Correct Answers', value: result.correctAnswers, icon: FiCheckCircle },
    { label: 'Incorrect Answers', value: result.incorrectAnswers, icon: FiXCircle },
    { label: 'Score Percentage', value: `${result.scorePercentage}%`, icon: FiCheckCircle },
  ]

  return (
    <div className={styles.page}>
      <MotionSection
        className={styles.resultCard}
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <p className={styles.sectionLabel}>Quiz Result</p>
        <h1>{result.quiz.title}</h1>
        <p className={styles.resultText}>
          {result.passed
            ? 'Outstanding work. You cleared the minimum score threshold.'
            : 'Good attempt. Review the concepts and launch another attempt.'}
        </p>

        <div className={styles.statusBadge}>
          <span>{result.passed ? 'Passed' : 'Needs Improvement'}</span>
          <strong>{result.elapsedLabel}</strong>
        </div>

        <div className={styles.grid}>
          {cards.map(({ label, value, icon: Icon }) => (
            <article key={label} className={styles.metricCard}>
              {createElement(Icon)}
              <p>{label}</p>
              <strong>{value}</strong>
            </article>
          ))}
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.primaryButton} onClick={() => navigate('/dashboard')}>
            Dashboard
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => navigate(`/play/${result.quiz.id}`)}
          >
            <FiPlay />
            <span>Play Again</span>
          </button>
        </div>
      </MotionSection>
    </div>
  )
}

export default ResultsPage
