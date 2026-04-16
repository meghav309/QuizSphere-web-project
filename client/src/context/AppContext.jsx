import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { loginRequest, signupRequest } from '../services/authService'
import {
  createQuizRequest,
  deleteQuizRequest,
  fetchQuizzesRequest,
  toggleQuizRequest,
  updateQuizRequest,
} from '../services/quizService'

const AppContext = createContext(null)

const defaultCategories = ['Logical Reasoning', 'Data Interpretation', 'Programming']

const getStoredUser = () => {
  const rawUser = localStorage.getItem('quizsphere_user')
  return rawUser ? JSON.parse(rawUser) : null
}

export const AppProvider = ({ children }) => {
  const [theme, setTheme] = useState(localStorage.getItem('quizsphere_theme') || 'dark')
  const [token, setToken] = useState(localStorage.getItem('quizsphere_token') || '')
  const [user, setUser] = useState(getStoredUser)
  const [quizzes, setQuizzes] = useState([])
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(false)

  useEffect(() => {
    document.body.dataset.theme = theme
    localStorage.setItem('quizsphere_theme', theme)
  }, [theme])

  useEffect(() => {
    const bootstrap = async () => {
      if (!token) {
        setIsBootstrapping(false)
        return
      }

      try {
        setIsLoadingQuizzes(true)
        const items = await fetchQuizzesRequest()
        setQuizzes(items)
      } catch {
        setToken('')
        setUser(null)
        localStorage.removeItem('quizsphere_token')
        localStorage.removeItem('quizsphere_user')
      } finally {
        setIsLoadingQuizzes(false)
        setIsBootstrapping(false)
      }
    }

    bootstrap()
  }, [token])

  const persistSession = (payload) => {
    localStorage.setItem('quizsphere_token', payload.token)
    localStorage.setItem('quizsphere_user', JSON.stringify(payload.user))
    setToken(payload.token)
    setUser(payload.user)
  }

  const login = async (credentials) => {
    const payload = await loginRequest(credentials)
    persistSession(payload)
    const items = await fetchQuizzesRequest()
    setQuizzes(items)
    return payload
  }

  const signup = async (credentials) => {
    const payload = await signupRequest(credentials)
    persistSession(payload)
    const items = await fetchQuizzesRequest()
    setQuizzes(items)
    return payload
  }

  const logout = () => {
    setToken('')
    setUser(null)
    setQuizzes([])
    localStorage.removeItem('quizsphere_token')
    localStorage.removeItem('quizsphere_user')
    sessionStorage.removeItem('quizsphere_result')
  }

  const refreshQuizzes = async () => {
    setIsLoadingQuizzes(true)
    try {
      const items = await fetchQuizzesRequest()
      setQuizzes(items)
      return items
    } finally {
      setIsLoadingQuizzes(false)
    }
  }

  const addQuiz = async (payload) => {
    const quiz = await createQuizRequest(payload)
    setQuizzes((current) => [quiz, ...current])
    return quiz
  }

  const updateQuiz = async (quizId, payload) => {
    const updatedQuiz = await updateQuizRequest(quizId, payload)
    setQuizzes((current) =>
      current.map((quiz) => (quiz.id === quizId ? updatedQuiz : quiz)),
    )
    return updatedQuiz
  }

  const toggleQuiz = async (quizId) => {
    const updatedQuiz = await toggleQuizRequest(quizId)
    setQuizzes((current) =>
      current.map((quiz) => (quiz.id === quizId ? updatedQuiz : quiz)),
    )
    return updatedQuiz
  }

  const deleteQuiz = async (quizId) => {
    await deleteQuizRequest(quizId)
    setQuizzes((current) => current.filter((quiz) => quiz.id !== quizId))
  }

  const categories = useMemo(() => {
    const dynamicCategories = quizzes.map((quiz) => quiz.category)
    return [...new Set([...defaultCategories, ...dynamicCategories])]
  }, [quizzes])

  const value = {
    theme,
    setTheme,
    token,
    user,
    quizzes,
    categories,
    isAuthenticated: Boolean(token),
    isBootstrapping,
    isLoadingQuizzes,
    login,
    signup,
    logout,
    refreshQuizzes,
    addQuiz,
    updateQuiz,
    toggleQuiz,
    deleteQuiz,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useAppContext = () => {
  const context = useContext(AppContext)

  if (!context) {
    throw new Error('useAppContext must be used inside AppProvider')
  }

  return context
}
