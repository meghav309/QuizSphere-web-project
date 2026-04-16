import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { FiArrowRight, FiMail, FiLock, FiUser } from 'react-icons/fi'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import logo from '../assets/quizsphere-logo.svg'
import { useAppContext } from '../context/AppContext'
import styles from '../styles/auth.module.css'

const initialSignup = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
}

const initialLogin = {
  email: '',
  password: '',
}

const isEmailValid = (value) => /\S+@\S+\.\S+/.test(value)

const AuthPage = () => {
  const MotionDiv = motion.div
  const navigate = useNavigate()
  const location = useLocation()
  const { login, signup } = useAppContext()
  const [mode, setMode] = useState('login')
  const [loginForm, setLoginForm] = useState(initialLogin)
  const [signupForm, setSignupForm] = useState(initialSignup)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const destination = useMemo(
    () => location.state?.from?.pathname || '/dashboard',
    [location.state],
  )

  const validateLogin = () => {
    if (!loginForm.email.trim() || !loginForm.password.trim()) {
      return 'Email and password are required.'
    }

    if (!isEmailValid(loginForm.email)) {
      return 'Please enter a valid email address.'
    }

    return ''
  }

  const validateSignup = () => {
    const { name, email, password, confirmPassword } = signupForm

    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      return 'All signup fields are required.'
    }

    if (!isEmailValid(email)) {
      return 'Please enter a valid email address.'
    }

    if (password.length < 6) {
      return 'Password must contain at least 6 characters.'
    }

    if (password !== confirmPassword) {
      return 'Password and confirm password must match.'
    }

    return ''
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const message = mode === 'login' ? validateLogin() : validateSignup()

    if (message) {
      toast.error(message)
      return
    }

    try {
      setIsSubmitting(true)

      if (mode === 'login') {
        await login(loginForm)
        toast.success('Welcome back to Quizsphere.')
      } else {
        await signup(signupForm)
        toast.success('Account created successfully.')
      }

      navigate(destination, { replace: true })
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to continue.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <MotionDiv
        className={styles.authCard}
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <div className={styles.brandPanel}>
          <img src={logo} alt="Quizsphere logo" className={styles.logo} />
          <p className={styles.eyebrow}>Welcome to Quizsphere</p>
          <h1>{mode === 'login' ? 'Sign in to continue' : 'Create your account'}</h1>
          <p className={styles.description}>
            Build modern quizzes, manage categories, and launch interactive tests from one
            clean dashboard.
          </p>
        </div>

        <div className={styles.formPanel}>
          <div className={styles.toggle}>
            <button
              type="button"
              className={mode === 'login' ? styles.toggleActive : ''}
              onClick={() => setMode('login')}
            >
              Login
            </button>
            <button
              type="button"
              className={mode === 'signup' ? styles.toggleActive : ''}
              onClick={() => setMode('signup')}
            >
              Signup
            </button>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            {mode === 'signup' ? (
              <label className={styles.inputGroup}>
                <span>Name</span>
                <div className={styles.inputWrap}>
                  <FiUser />
                  <input
                    type="text"
                    value={signupForm.name}
                    onChange={(event) =>
                      setSignupForm((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Enter your full name"
                  />
                </div>
              </label>
            ) : null}

            <label className={styles.inputGroup}>
              <span>Email</span>
              <div className={styles.inputWrap}>
                <FiMail />
                <input
                  type="email"
                  value={mode === 'login' ? loginForm.email : signupForm.email}
                  onChange={(event) =>
                    mode === 'login'
                      ? setLoginForm((current) => ({ ...current, email: event.target.value }))
                      : setSignupForm((current) => ({ ...current, email: event.target.value }))
                  }
                  placeholder="Enter your email"
                />
              </div>
            </label>

            <label className={styles.inputGroup}>
              <span>Password</span>
              <div className={styles.inputWrap}>
                <FiLock />
                <input
                  type="password"
                  value={mode === 'login' ? loginForm.password : signupForm.password}
                  onChange={(event) =>
                    mode === 'login'
                      ? setLoginForm((current) => ({ ...current, password: event.target.value }))
                      : setSignupForm((current) => ({ ...current, password: event.target.value }))
                  }
                  placeholder="Enter your password"
                />
              </div>
            </label>

            {mode === 'signup' ? (
              <label className={styles.inputGroup}>
                <span>Confirm Password</span>
                <div className={styles.inputWrap}>
                  <FiLock />
                  <input
                    type="password"
                    value={signupForm.confirmPassword}
                    onChange={(event) =>
                      setSignupForm((current) => ({
                        ...current,
                        confirmPassword: event.target.value,
                      }))
                    }
                    placeholder="Re-enter your password"
                  />
                </div>
              </label>
            ) : null}

            <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
              <span>{isSubmitting ? 'Please wait...' : mode === 'login' ? 'Login' : 'Signup'}</span>
              <FiArrowRight />
            </button>
          </form>

          <p className={styles.footerText}>
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
            <button type="button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
              {mode === 'login' ? 'Create it now' : 'Sign in'}
            </button>
          </p>
        </div>
      </MotionDiv>
    </div>
  )
}

export default AuthPage
