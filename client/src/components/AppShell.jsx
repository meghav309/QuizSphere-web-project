import { motion } from 'framer-motion'
import { FiMoon, FiSun } from 'react-icons/fi'
import { Outlet } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import styles from '../styles/layout.module.css'
import Sidebar from './Sidebar'

const AppShell = () => {
  const MotionMain = motion.main
  const { theme, setTheme, user } = useAppContext()
  const initials = user?.name
    ?.split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.contentWrap}>
        <header className={styles.header}>
          <div>
            <p className={styles.headerEyebrow}>Modern quiz platform</p>
            <h1 className={styles.headerTitle}>Manage, create, and play immersive quizzes</h1>
          </div>

          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.themeButton}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <FiSun /> : <FiMoon />}
              <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </button>

            <div className={styles.profileBadge}>
              <div className={styles.profileAvatar}>{initials || 'QS'}</div>
              <div>
                <strong>{user?.name || 'Quiz Admin'}</strong>
                <p>{user?.email || 'hello@quizsphere.app'}</p>
              </div>
            </div>
          </div>
        </header>

        <MotionMain
          className={styles.main}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <Outlet />
        </MotionMain>
      </div>
    </div>
  )
}

export default AppShell
