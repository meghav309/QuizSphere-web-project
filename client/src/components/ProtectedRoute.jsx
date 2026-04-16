import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import LoadingSpinner from './LoadingSpinner'

const ProtectedRoute = () => {
  const { isAuthenticated, isBootstrapping } = useAppContext()
  const location = useLocation()

  if (isBootstrapping) {
    return <LoadingSpinner fullScreen />
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace state={{ from: location }} />
  }

  return <Outlet />
}

export default ProtectedRoute
