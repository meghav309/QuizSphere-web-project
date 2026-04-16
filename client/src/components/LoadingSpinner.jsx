import styles from '../styles/spinner.module.css'

const LoadingSpinner = ({ fullScreen = false, label = 'Loading Quizsphere...' }) => (
  <div className={fullScreen ? styles.fullScreen : styles.inline}>
    <span className={styles.spinner} />
    <p className={styles.label}>{label}</p>
  </div>
)

export default LoadingSpinner
