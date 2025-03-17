import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const PrivateRoute = ({ children, role }) => {
  const { user } = useAuth()
  console.log('PrivateRoute check:', { user, requiredRole: role })

  if (!user) {
    console.log('No user found, redirecting to login')
    return <Navigate to="/login" />
  }

  // Check if user has the required role in their metadata
  // If no specific role is required, allow authenticated users
  if (!role) {
    return children
  }

  // Get role from user metadata or default role
  const userRole = user.user_metadata?.role || (user.role === 'authenticated' ? 'student' : user.role)
  console.log('Role check:', { userRole, requiredRole: role })

  if (role && userRole !== role) {
    console.log('Role mismatch:', { required: role, user: userRole })
    return <Navigate to="/" />
  }

  return children
}

export default PrivateRoute 