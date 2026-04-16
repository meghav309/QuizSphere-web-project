import jwt from 'jsonwebtoken'

export const createToken = (user) =>
  jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
    },
    process.env.JWT_SECRET || 'quizsphere-secret-key',
    {
      expiresIn: '7d',
    },
  )

export const requireAuth = (request, response, next) => {
  const authHeader = request.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    return response.status(401).json({ message: 'Authorization token is required.' })
  }

  const token = authHeader.replace('Bearer ', '')

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'quizsphere-secret-key')
    request.user = payload
    return next()
  } catch {
    return response.status(401).json({ message: 'Session expired. Please sign in again.' })
  }
}
