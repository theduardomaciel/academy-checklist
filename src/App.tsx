import { Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from './contexts/AuthContext'
import Header from './components/Header'
import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import ChecklistSession from './pages/ChecklistSession'
import History from './pages/History'
import SessionDetail from './pages/SessionDetail'

function FullScreenLoader() {
  return (
    <div className="centered-shell">
      <div className="spinner" style={{ color: 'var(--color-primary)' }} />
    </div>
  )
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const { user, loading } = useAuth()

  return (
    <div className="app-shell">
      {user && <Header />}
      <Routes>
        <Route
          path="/login"
          element={loading ? <FullScreenLoader /> : user ? <Navigate to="/" replace /> : <Login />}
        />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sessao/:sessionId"
          element={
            <ProtectedRoute>
              <ChecklistSession />
            </ProtectedRoute>
          }
        />
        <Route
          path="/historico"
          element={
            <ProtectedRoute>
              <History />
            </ProtectedRoute>
          }
        />
        <Route
          path="/historico/:sessionId"
          element={
            <ProtectedRoute>
              <SessionDetail />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
