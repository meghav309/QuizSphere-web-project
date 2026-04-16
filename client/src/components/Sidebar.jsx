import { createElement } from 'react'
import { FiBookOpen, FiGrid, FiHelpCircle, FiLogOut, FiPlusSquare, FiSettings, FiTag } from 'react-icons/fi'
import { NavLink, useNavigate } from 'react-router-dom'
import logo from '../assets/quizsphere-logo.svg'
import { useAppContext } from '../context/AppContext'
import styles from '../styles/layout.module.css'

const items = [
  { label: 'Dashboard', to: '/dashboard', icon: FiGrid },
  { label: 'Categories', to: '/dashboard?section=categories', icon: FiTag },
  { label: 'Quizzes', to: '/dashboard?section=quizzes', icon: FiBookOpen },
  { label: 'Add Quiz', to: '/add-quiz', icon: FiPlusSquare },
  { label: 'Questions', to: '/dashboard?section=questions', icon: FiHelpCircle },
  { label: 'Settings', to: '/dashboard?section=settings', icon: FiSettings },
]

const Sidebar = () => {
  const navigate = useNavigate()
  const { logout } = useAppContext()

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brandCard}>
        <img src={logo} alt="Quizsphere logo" className={styles.brandLogo} />
        <div>
          <h2>Quizsphere</h2>
          <p>Quiz control center</p>
        </div>
      </div>

      <nav className={styles.nav}>
        {items.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={label}
            to={to}
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
            }
          >
            {createElement(Icon)}
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        className={styles.logoutButton}
        onClick={() => {
          logout()
          navigate('/auth')
        }}
      >
        <FiLogOut />
        <span>Logout</span>
      </button>
    </aside>
  )
}

export default Sidebar
