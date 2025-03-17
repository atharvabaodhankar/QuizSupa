import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const PrivateRoute = ({ children, role }) => {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" />
  }

  // Check if user has the required role in their metadata
  const userRole = user.user_metadata?.role
  if (role && userRole !== role) {
    console.log('Role mismatch:', { required: role, user: userRole })
    return <Navigate to="/" />
  }

  return children
}

export default PrivateRoute 