import 'dotenv/config'
import bcrypt from 'bcryptjs'
import cors from 'cors'
import express from 'express'
import { randomUUID } from 'node:crypto'
import { createToken, requireAuth } from './middleware/auth.js'
import { ensureStore, readStore, writeStore } from './utils/fileStore.js'

const app = express()
const port = Number(process.env.PORT) || 5000
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173'

app.use(
  cors({
    origin: clientOrigin,
    credentials: true,
  }),
)
app.use(express.json({ limit: '10mb' }))

const normalizeQuiz = (quiz) => ({
  ...quiz,
  questionsCount: quiz.questions.length,
})

const stripQuestionAnswer = (question) => ({
  id: question.id,
  section: question.section,
  prompt: question.prompt,
  options: question.options,
})

const decodeHtml = (value) =>
  value
    .replaceAll('&quot;', '"')
    .replaceAll('&#039;', "'")
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')

const fetchRemoteQuestions = async (amount = 10) => {
  const response = await fetch(`https://opentdb.com/api.php?amount=${amount}&type=multiple`)
  if (!response.ok) {
    throw new Error('Unable to fetch remote questions.')
  }

  const payload = await response.json()

  return payload.results.map((item, index) => {
    const options = [...item.incorrect_answers, item.correct_answer]
      .map(decodeHtml)
      .sort(() => Math.random() - 0.5)

    return {
      id: `remote-${index + 1}`,
      section: ['Logical', 'Aptitude', 'Reasoning'][index % 3],
      prompt: decodeHtml(item.question),
      options,
      answer: decodeHtml(item.correct_answer),
    }
  })
}

const withFallbackQuestions = async (quiz, amount) => {
  if (quiz?.questions?.length) {
    return quiz.questions
  }

  try {
    return await fetchRemoteQuestions(amount)
  } catch {
    return []
  }
}

const getAuthenticatedUser = async (request) => {
  const store = await readStore()
  return store.users.find((user) => user.id === request.user.sub)
}

app.get('/health', async (_request, response) => {
  await ensureStore()
  response.json({ status: 'ok', app: 'Quizsphere API' })
})

app.post('/signup', async (request, response) => {
  const { name, email, password, confirmPassword } = request.body

  if (!name?.trim() || !email?.trim() || !password?.trim() || !confirmPassword?.trim()) {
    return response.status(400).json({ message: 'All fields are required.' })
  }

  if (password !== confirmPassword) {
    return response.status(400).json({ message: 'Passwords do not match.' })
  }

  const store = await readStore()
  const existingUser = store.users.find((user) => user.email.toLowerCase() === email.toLowerCase())

  if (existingUser) {
    return response.status(409).json({ message: 'An account with this email already exists.' })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = {
    id: randomUUID(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    passwordHash,
    createdAt: new Date().toISOString(),
  }

  store.users.push(user)
  await writeStore(store)

  const token = createToken(user)

  return response.status(201).json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    message: 'Account created successfully.',
  })
})

app.post('/login', async (request, response) => {
  const { email, password } = request.body

  if (!email?.trim() || !password?.trim()) {
    return response.status(400).json({ message: 'Email and password are required.' })
  }

  const store = await readStore()
  const user = store.users.find((entry) => entry.email.toLowerCase() === email.toLowerCase())

  if (!user) {
    return response.status(401).json({ message: 'Invalid email or password.' })
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash)

  if (!isMatch) {
    return response.status(401).json({ message: 'Invalid email or password.' })
  }

  const token = createToken(user)

  return response.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    message: 'Login successful.',
  })
})

app.get('/quizzes', requireAuth, async (_request, response) => {
  const store = await readStore()
  const quizzes = store.quizzes.map(normalizeQuiz)
  response.json({ quizzes })
})

app.get('/questions', requireAuth, async (request, response) => {
  const store = await readStore()
  const { quizId, source, amount } = request.query
  const parsedAmount = Number(amount) || 10

  if (source === 'remote' && !quizId) {
    const questions = await fetchRemoteQuestions(parsedAmount)
    return response.json({
      quiz: {
        id: 'remote-trivia',
        title: 'Live Trivia Challenge',
        category: 'General Knowledge',
        timerEnabled: true,
        minPoints: 60,
      },
      questions: questions.map(stripQuestionAnswer),
      answerKey: Object.fromEntries(questions.map((question) => [question.id, question.answer])),
    })
  }

  const quiz = store.quizzes.find((entry) => entry.id === quizId)

  if (!quiz) {
    return response.status(404).json({ message: 'Quiz not found.' })
  }

  const questions = await withFallbackQuestions(quiz, parsedAmount)

  return response.json({
    quiz: normalizeQuiz(quiz),
    questions: questions.map(stripQuestionAnswer),
  })
})

app.post('/quiz', requireAuth, async (request, response) => {
  const currentUser = await getAuthenticatedUser(request)
  if (!currentUser) {
    return response.status(401).json({ message: 'User session is invalid.' })
  }

  const {
    category,
    title,
    image,
    timerEnabled,
    minPoints,
    description,
    active,
    questions = [],
  } = request.body

  if (!category?.trim() || !title?.trim()) {
    return response.status(400).json({ message: 'Category and title are required.' })
  }

  const store = await readStore()
  const quiz = {
    id: randomUUID(),
    category: category.trim(),
    title: title.trim(),
    image: image?.trim() || '',
    timerEnabled: Boolean(timerEnabled),
    minPoints: Number(minPoints) || 0,
    description: description?.trim() || '<p>No description provided.</p>',
    active: active !== false,
    isEnabled: active !== false,
    createdAt: new Date().toISOString(),
    createdBy: currentUser.id,
    questions: Array.isArray(questions) ? questions : [],
  }

  store.quizzes.unshift(quiz)
  await writeStore(store)

  return response.status(201).json({
    message: 'Quiz added successfully.',
    quiz: normalizeQuiz(quiz),
  })
})

app.put('/quiz/:quizId', requireAuth, async (request, response) => {
  const store = await readStore()
  const quizIndex = store.quizzes.findIndex((entry) => entry.id === request.params.quizId)

  if (quizIndex === -1) {
    return response.status(404).json({ message: 'Quiz not found.' })
  }

  const existingQuiz = store.quizzes[quizIndex]
  const nextQuiz = {
    ...existingQuiz,
    ...request.body,
    title: request.body.title?.trim() || existingQuiz.title,
    category: request.body.category?.trim() || existingQuiz.category,
    image: request.body.image?.trim() || existingQuiz.image,
    description: request.body.description?.trim() || existingQuiz.description,
    minPoints: Number(request.body.minPoints ?? existingQuiz.minPoints),
    timerEnabled:
      typeof request.body.timerEnabled === 'boolean'
        ? request.body.timerEnabled
        : existingQuiz.timerEnabled,
    active: typeof request.body.active === 'boolean' ? request.body.active : existingQuiz.active,
    isEnabled:
      typeof request.body.isEnabled === 'boolean'
        ? request.body.isEnabled
        : typeof request.body.active === 'boolean'
          ? request.body.active
          : existingQuiz.isEnabled,
  }

  store.quizzes[quizIndex] = nextQuiz
  await writeStore(store)

  return response.json({
    message: 'Quiz updated successfully.',
    quiz: normalizeQuiz(nextQuiz),
  })
})

app.patch('/quiz/:quizId/toggle', requireAuth, async (request, response) => {
  const store = await readStore()
  const quiz = store.quizzes.find((entry) => entry.id === request.params.quizId)

  if (!quiz) {
    return response.status(404).json({ message: 'Quiz not found.' })
  }

  quiz.isEnabled = !quiz.isEnabled
  quiz.active = quiz.isEnabled
  await writeStore(store)

  return response.json({
    message: `Quiz ${quiz.isEnabled ? 'enabled' : 'disabled'} successfully.`,
    quiz: normalizeQuiz(quiz),
  })
})

app.delete('/quiz/:quizId', requireAuth, async (request, response) => {
  const store = await readStore()
  const initialLength = store.quizzes.length
  store.quizzes = store.quizzes.filter((entry) => entry.id !== request.params.quizId)

  if (store.quizzes.length === initialLength) {
    return response.status(404).json({ message: 'Quiz not found.' })
  }

  await writeStore(store)
  return response.json({ message: 'Quiz deleted successfully.' })
})

app.post('/submit', requireAuth, async (request, response) => {
  const { quizId, answers } = request.body
  const store = await readStore()
  const quiz = store.quizzes.find((entry) => entry.id === quizId)

  if (!quiz) {
    return response.status(404).json({ message: 'Quiz not found.' })
  }

  const submittedAnswers = answers || {}
  const totalQuestions = quiz.questions.length
  const correctAnswers = quiz.questions.filter(
    (question) => submittedAnswers[question.id] === question.answer,
  ).length
  const scorePercentage = totalQuestions ? Math.round((correctAnswers / totalQuestions) * 100) : 0

  return response.json({
    quiz: {
      id: quiz.id,
      title: quiz.title,
      category: quiz.category,
      minPoints: quiz.minPoints,
    },
    totalQuestions,
    correctAnswers,
    incorrectAnswers: totalQuestions - correctAnswers,
    scorePercentage,
    passed: scorePercentage >= quiz.minPoints,
  })
})

app.use((error, _request, response, _next) => {
  console.error(error)
  response.status(500).json({ message: 'Something went wrong on the server.' })
})

ensureStore().then(() => {
  app.listen(port, () => {
    console.log(`Quizsphere API running on http://localhost:${port}`)
  })
})
