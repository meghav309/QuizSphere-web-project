import api from './api'

export const signupRequest = async (payload) => {
  const { data } = await api.post('/signup', payload)
  return data
}

export const loginRequest = async (payload) => {
  const { data } = await api.post('/login', payload)
  return data
}
