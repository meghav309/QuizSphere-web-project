import { motion } from 'framer-motion'
import logo from '../assets/quizsphere-logo.svg'
import styles from '../styles/splash.module.css'

const SplashScreen = () => {
  const MotionDiv = motion.div
  const MotionImage = motion.img
  const MotionHeading = motion.h1
  const MotionText = motion.p

  return (
    <div className={styles.container}>
      <MotionDiv
        className={styles.content}
        initial={{ opacity: 0, scale: 0.78 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <MotionImage
          src={logo}
          alt="Quizsphere logo"
          className={styles.logo}
          initial={{ rotate: -12, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
        <MotionHeading
          className={styles.title}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          Quiz App
        </MotionHeading>
        <MotionText
          className={styles.subtitle}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          In React Js
        </MotionText>
      </MotionDiv>
    </div>
  )
}

export default SplashScreen
