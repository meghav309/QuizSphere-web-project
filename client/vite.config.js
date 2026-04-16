import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/health': 'http://localhost:5000',
      '/login': 'http://localhost:5000',
      '/signup': 'http://localhost:5000',
      '/quizzes': 'http://localhost:5000',
      '/questions': 'http://localhost:5000',
      '/quiz': 'http://localhost:5000',
      '/submit': 'http://localhost:5000',
    },
  },
})
