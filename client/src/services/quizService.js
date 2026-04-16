import api from './api'

export const fetchQuizzesRequest = async () => {
  const { data } = await api.get('/quizzes')
  return data.quizzes
}

export const createQuizRequest = async (payload) => {
  const { data } = await api.post('/quiz', payload)
  return data.quiz
}

export const updateQuizRequest = async (quizId, payload) => {
  const { data } = await api.put(`/quiz/${quizId}`, payload)
  return data.quiz
}

export const toggleQuizRequest = async (quizId) => {
  const { data } = await api.patch(`/quiz/${quizId}/toggle`)
  return data.quiz
}

export const deleteQuizRequest = async (quizId) => {
  const { data } = await api.delete(`/quiz/${quizId}`)
  return data
}

export const fetchQuestionsRequest = async (quizId) => {
  const { data } = await api.get(`/questions?quizId=${quizId}`)
  return data
}

export const submitQuizRequest = async (payload) => {
  const { data } = await api.post('/submit', payload)
  return data
}
