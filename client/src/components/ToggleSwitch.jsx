import styles from '../styles/common.module.css'

const ToggleSwitch = ({ checked, onChange, label }) => (
  <label className={styles.switchField}>
    {label ? <span>{label}</span> : null}
    <button
      type="button"
      className={`${styles.switch} ${checked ? styles.switchActive : ''}`}
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
    >
      <span className={styles.switchThumb} />
    </button>
  </label>
)

export default ToggleSwitch
