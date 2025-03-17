import { ChakraProvider, CSSReset } from '@chakra-ui/react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import PrivateRoute from './components/PrivateRoute'
import Navbar from './components/Navbar'
import ErrorBoundary from './components/ErrorBoundary'

// Pages
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import TeacherDashboard from './pages/TeacherDashboard'
import StudentDashboard from './pages/StudentDashboard'
import CreateTest from './pages/CreateTest'
import EditTest from './pages/EditTest'
import TestAnalytics from './pages/TestAnalytics'
import TakeTest from './pages/TakeTest'
import GenerateQuiz from './pages/GenerateQuiz'

function App() {
  return (
    <ErrorBoundary>
      <ChakraProvider>
        <CSSReset />
        <AuthProvider>
          <Router>
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/teacher/dashboard"
                element={
                  <PrivateRoute role="teacher">
                    <TeacherDashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/teacher/generate-quiz"
                element={
                  <PrivateRoute role="teacher">
                    <GenerateQuiz />
                  </PrivateRoute>
                }
              />
              <Route
                path="/teacher/create-test"
                element={
                  <PrivateRoute role="teacher">
                    <CreateTest />
                  </PrivateRoute>
                }
              />
              <Route
                path="/teacher/edit-test/:id"
                element={
                  <PrivateRoute role="teacher">
                    <EditTest />
                  </PrivateRoute>
                }
              />
              <Route
                path="/teacher/test-analytics/:id"
                element={
                  <PrivateRoute role="teacher">
                    <TestAnalytics />
                  </PrivateRoute>
                }
              />
              <Route
                path="/student/dashboard"
                element={
                  <PrivateRoute role="student">
                    <StudentDashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/take-test/:id"
                element={
                  <PrivateRoute role="student">
                    <TakeTest />
                  </PrivateRoute>
                }
              />
            </Routes>
          </Router>
        </AuthProvider>
      </ChakraProvider>
    </ErrorBoundary>
  )
}

export default App
