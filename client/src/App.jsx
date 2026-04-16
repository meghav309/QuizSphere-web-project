import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import AppShell from './components/AppShell'
import ProtectedRoute from './components/ProtectedRoute'
import SplashScreen from './components/SplashScreen'
import { useAppContext } from './context/AppContext'
import AddQuizPage from './pages/AddQuizPage'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import QuizPlayPage from './pages/QuizPlayPage'
import ResultsPage from './pages/ResultsPage'
import 'react-toastify/dist/ReactToastify.css'

const PublicRedirect = () => {
  const { isAuthenticated } = useAppContext()
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <AuthPage />
}

function App() {
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 2500)
    return () => window.clearTimeout(timer)
  }, [])

  if (showSplash) {
    return <SplashScreen />
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/auth" replace />} />
        <Route path="/auth" element={<PublicRedirect />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/add-quiz" element={<AddQuizPage />} />
            <Route path="/play/:quizId" element={<QuizPlayPage />} />
            <Route path="/results" element={<ResultsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>

      <ToastContainer position="top-right" autoClose={2400} theme="colored" />
    </>
  )
}

export default App
