import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, supabaseAdmin } from '../lib/supabase'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
      if (sessionError) {
        console.error('Session error:', sessionError)
        setError(sessionError.message)
      } else {
        if (session?.user) {
          console.log('Setting user:', session.user)
          setUser(session.user)
        } else {
          console.log('No active session')
          setUser(null)
        }
      }
      setLoading(false)
    })

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        console.log('Auth state changed, new user:', session.user)
        setUser(session.user)
      } else {
        console.log('Auth state changed, no user')
        setUser(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async ({ email, password, role, name, rollNumber }) => {
    try {
      setError(null)
      
      // Validate role
      if (!['teacher', 'student'].includes(role)) {
        throw new Error('Invalid role. Must be either "teacher" or "student".')
      }

      // Validate student fields
      if (role === 'student') {
        if (!name || !name.trim()) {
          throw new Error('Name is required for students')
        }
        if (!rollNumber || !rollNumber.trim()) {
          throw new Error('Roll number is required for students')
        }
      }

      console.log('Attempting signup with:', { email, role, name, rollNumber })

      // First, sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role,
            name: role === 'student' ? name : null,
            rollNumber: role === 'student' ? rollNumber : null,
          },
        },
      })

      if (authError) {
        console.error('Auth signup error:', authError)
        throw authError
      }

      console.log('Auth signup successful:', authData)

      if (!authData.user?.id) {
        throw new Error('User ID not found after signup')
      }

      // Then, create the profile
      if (!supabaseAdmin) {
        console.warn('Service role client not available, using regular client for profile creation')
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: authData.user.id,
              role: role,
              name: role === 'student' ? name : null,
              roll_number: role === 'student' ? rollNumber : null
            }
          ])
          .select()

        if (profileError) {
          console.error('Profile creation error:', profileError)
          // If profile creation fails, we should clean up the auth user
          await supabase.auth.signOut()
          throw profileError
        }
      } else {
        // Use admin client if available
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert([
            {
              id: authData.user.id,
              role: role,
              name: role === 'student' ? name : null,
              roll_number: role === 'student' ? rollNumber : null
            }
          ])
          .select()

        if (profileError) {
          console.error('Profile creation error:', profileError)
          // If profile creation fails, we should clean up the auth user
          await supabase.auth.signOut()
          throw profileError
        }
      }

      return { data: authData, error: null }
    } catch (err) {
      console.error('Sign up error:', err)
      console.error('Error details:', {
        message: err.message,
        status: err.status,
        name: err.name,
        stack: err.stack
      })
      setError(err.message)
      return { data: null, error: err }
    }
  }

  const signIn = async ({ email, password }) => {
    try {
      setError(null)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      
      if (data?.user) {
        console.log('Sign in successful:', data.user)
        setUser(data.user)
      }
      
      return { data, error: null }
    } catch (err) {
      console.error('Sign in error:', err)
      setError(err.message)
      return { data: null, error: err }
    }
  }

  const signOut = async () => {
    try {
      setError(null)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
      return { error: null }
    } catch (err) {
      console.error('Sign out error:', err)
      setError(err.message)
      return { error: err }
    }
  }

  const value = {
    user,
    loading,
    error,
    signUp,
    signIn,
    signOut,
  }

  console.log('AuthContext current state:', { user, loading, error })

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 