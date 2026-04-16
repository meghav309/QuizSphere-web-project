import { useMemo, useState } from 'react'
import { FiEdit2, FiPlay, FiPlus, FiSearch, FiTrash2 } from 'react-icons/fi'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAppContext } from '../context/AppContext'
import styles from '../styles/dashboard.module.css'
import LoadingSpinner from '../components/LoadingSpinner'
import ToggleSwitch from '../components/ToggleSwitch'

const DashboardPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const section = searchParams.get('section') || 'dashboard'
  const { quizzes, categories, isLoadingQuizzes, toggleQuiz, deleteQuiz } = useAppContext()
  const [searchTerm, setSearchTerm] = useState('')

  const filteredQuizzes = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase()

    return quizzes.filter((quiz) => {
      if (!normalized) {
        return true
      }

      return [quiz.title, quiz.category].some((value) =>
        value.toLowerCase().includes(normalized),
      )
    })
  }, [quizzes, searchTerm])

  const stats = useMemo(
    () => [
      { label: 'Total Quizzes', value: quizzes.length },
      { label: 'Active Quizzes', value: quizzes.filter((quiz) => quiz.isEnabled).length },
      { label: 'Categories', value: categories.length },
      {
        label: 'Questions Bank',
        value: quizzes.reduce((total, quiz) => total + (quiz.questionsCount || 0), 0),
      },
    ],
    [categories.length, quizzes],
  )

  const handleToggle = async (quizId) => {
    try {
      await toggleQuiz(quizId)
      toast.success('Quiz status updated.')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update quiz status.')
    }
  }

  const handleDelete = async (quizId) => {
    try {
      await deleteQuiz(quizId)
      toast.success('Quiz deleted successfully.')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to delete quiz.')
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.sectionLabel}>{section === 'dashboard' ? 'Dashboard' : section}</p>
          <h2>View Quizzes &amp; Add Quizzes</h2>
          <p className={styles.heroText}>
            Easily view, manage, and create Quizsphere content from the dashboard with smooth
            workflows, searchable tables, and fast quiz actions.
          </p>
        </div>

        <div className={styles.heroActions}>
          <div className={styles.searchWrap}>
            <FiSearch />
            <input
              type="search"
              placeholder="Search quizzes or categories"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>

          <button type="button" className={styles.primaryButton} onClick={() => navigate('/add-quiz')}>
            <FiPlus />
            <span>Add New Quiz</span>
          </button>
        </div>
      </section>

      <section className={styles.statsGrid}>
        {stats.map((item) => (
          <article key={item.label} className={styles.statCard}>
            <p>{item.label}</p>
            <strong>{item.value}</strong>
          </article>
        ))}
      </section>

      <section className={styles.categoriesCard} id="categories">
        <div className={styles.cardHeader}>
          <div>
            <h3>Categories</h3>
            <p>Quick overview of active quiz domains</p>
          </div>
        </div>

        <div className={styles.categoryList}>
          {categories.map((category) => (
            <span key={category} className={styles.categoryBadge}>
              {category}
            </span>
          ))}
        </div>
      </section>

      <section className={styles.tableCard} id="quizzes">
        <div className={styles.cardHeader}>
          <div>
            <h3>Quiz Inventory</h3>
            <p>Dashboard, categories, quiz management, and question readiness in one place</p>
          </div>
        </div>

        {isLoadingQuizzes ? (
          <LoadingSpinner label="Fetching quiz data..." />
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Serial No</th>
                  <th>Image</th>
                  <th>Category</th>
                  <th>Quiz Name</th>
                  <th>Number of Questions</th>
                  <th>Enable</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuizzes.map((quiz, index) => (
                  <tr key={quiz.id}>
                    <td>{index + 1}</td>
                    <td>
                      <img src={quiz.image} alt={quiz.title} className={styles.quizImage} />
                    </td>
                    <td>
                      <span className={styles.tableBadge}>{quiz.category}</span>
                    </td>
                    <td>{quiz.title}</td>
                    <td>{quiz.questionsCount}</td>
                    <td>
                      <ToggleSwitch checked={quiz.isEnabled} onChange={() => handleToggle(quiz.id)} />
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          type="button"
                          className={styles.iconButton}
                          onClick={() => navigate(`/play/${quiz.id}`)}
                        >
                          <FiPlay />
                        </button>
                        <button
                          type="button"
                          className={styles.iconButton}
                          onClick={() => navigate(`/add-quiz?edit=${quiz.id}`)}
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          type="button"
                          className={`${styles.iconButton} ${styles.deleteButton}`}
                          onClick={() => handleDelete(quiz.id)}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default DashboardPage
