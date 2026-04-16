import styles from '../styles/quiz.module.css'

const QuestionPalette = ({ questions, answers, currentId, visited, onSelect }) => (
  <div className={styles.palette}>
    <div className={styles.paletteHeader}>
      <h3>Question palette</h3>
      <p>Green = answered, Red = current, Gray = not visited</p>
    </div>

    <div className={styles.paletteGrid}>
      {questions.map((question, index) => {
        const isCurrent = question.id === currentId
        const isAnswered = Boolean(answers[question.id])
        const isVisited = visited.has(question.id)
        const className = isCurrent
          ? styles.paletteCurrent
          : isAnswered
            ? styles.paletteAnswered
            : isVisited
              ? styles.paletteVisited
              : styles.paletteIdle

        return (
          <button
            key={question.id}
            type="button"
            className={`${styles.paletteButton} ${className}`}
            onClick={() => onSelect(index)}
          >
            {index + 1}
          </button>
        )
      })}
    </div>
  </div>
)

export default QuestionPalette
