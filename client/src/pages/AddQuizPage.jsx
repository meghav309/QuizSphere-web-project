import { useEffect, useMemo, useState } from 'react'
import { FiArrowLeft, FiSave } from 'react-icons/fi'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import RichTextEditor from '../components/RichTextEditor'
import ToggleSwitch from '../components/ToggleSwitch'
import { useAppContext } from '../context/AppContext'
import styles from '../styles/form.module.css'

const blankForm = {
  category: '',
  title: '',
  image: '',
  timerEnabled: true,
  minPoints: 60,
  description: '<p>Compose an epic quiz description...</p>',
  active: true,
}

const AddQuizPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('edit')
  const { quizzes, categories, addQuiz, updateQuiz } = useAppContext()
  const [form, setForm] = useState(blankForm)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const editingQuiz = useMemo(
    () => quizzes.find((quiz) => quiz.id === editId),
    [editId, quizzes],
  )

  useEffect(() => {
    if (editingQuiz) {
      setForm({
        category: editingQuiz.category,
        title: editingQuiz.title,
        image: editingQuiz.image,
        timerEnabled: editingQuiz.timerEnabled,
        minPoints: editingQuiz.minPoints,
        description: editingQuiz.description,
        active: editingQuiz.active,
      })
      return
    }

    setForm(blankForm)
  }, [editingQuiz])

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setForm((current) => ({ ...current, image: String(reader.result) }))
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!form.category.trim() || !form.title.trim()) {
      toast.error('Category and quiz title are required.')
      return
    }

    if (!form.description.replace(/<[^>]+>/g, '').trim()) {
      toast.error('Please provide a description for the quiz.')
      return
    }

    try {
      setIsSubmitting(true)

      if (editingQuiz) {
        await updateQuiz(editingQuiz.id, {
          ...form,
          isEnabled: form.active,
        })
        toast.success('Quiz updated successfully.')
      } else {
        await addQuiz({
          ...form,
          questions: [],
        })
        toast.success('Quiz added successfully.')
      }

      navigate('/dashboard')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to save quiz.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <p className={styles.sectionLabel}>Quiz / {editingQuiz ? 'Edit Quiz' : 'Add Quiz'}</p>
          <h2>{editingQuiz ? 'Update quiz details' : 'Create a new quiz'}</h2>
        </div>
      </div>

      <form className={styles.formCard} onSubmit={handleSubmit}>
        <div className={styles.grid}>
          <label className={styles.field}>
            <span>Category</span>
            <select
              value={form.category}
              onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
            >
              <option value="">Select Category...</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Quiz Title</span>
            <input
              type="text"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Enter quiz title"
            />
          </label>

          <label className={`${styles.field} ${styles.fullWidth}`}>
            <span>Upload Image</span>
            <input type="file" accept="image/*" onChange={handleFileChange} />
            {form.image ? <img src={form.image} alt="Quiz preview" className={styles.previewImage} /> : null}
          </label>

          <div className={styles.toggleRow}>
            <ToggleSwitch
              checked={form.timerEnabled}
              onChange={(value) => setForm((current) => ({ ...current, timerEnabled: value }))}
              label="Timer"
            />

            <ToggleSwitch
              checked={form.active}
              onChange={(value) => setForm((current) => ({ ...current, active: value }))}
              label="Is Active"
            />
          </div>

          <label className={`${styles.field} ${styles.fullWidth}`}>
            <span>Minimum required points</span>
            <input
              type="number"
              min="0"
              max="100"
              value={form.minPoints}
              onChange={(event) =>
                setForm((current) => ({ ...current, minPoints: Number(event.target.value) }))
              }
              placeholder="Minimum score percentage"
            />
          </label>

          <label className={`${styles.field} ${styles.fullWidth}`}>
            <span>Description</span>
            <RichTextEditor
              value={form.description}
              onChange={(value) => setForm((current) => ({ ...current, description: value }))}
              placeholder="Compose an epic quiz description..."
            />
          </label>
        </div>

        <div className={styles.actions}>
          <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
            <FiSave />
            <span>{isSubmitting ? 'Saving...' : 'Submit'}</span>
          </button>

          <button type="button" className={styles.secondaryButton} onClick={() => navigate(-1)}>
            <FiArrowLeft />
            <span>Back</span>
          </button>
        </div>
      </form>
    </div>
  )
}

export default AddQuizPage
