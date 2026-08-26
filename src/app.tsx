import { Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from './contexts/auth-context'
import Header from './components/header'
import { CenteredLoader } from './components/page-shell'
import Login from './pages/login'
import ResetPassword from './pages/reset-password'
import Dashboard from './pages/dashboard'
import ChecklistSession from './pages/checklist-session'
import History from './pages/history'
import SessionDetail from './pages/session-detail'
import AdminUsers from './pages/admin-users'
import AdminChecklists from './pages/admin-checklists'

function FullScreenLoader() {
  return (
    <div className="flex min-h-dvh flex-1 flex-col items-center justify-center">
      <CenteredLoader />
    </div>
  )
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  const { user, loading } = useAuth()

  return (
    <div className="flex min-h-dvh flex-col">
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
        <Route
          path="/admin/usuarios"
          element={
            <AdminRoute>
              <AdminUsers />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/checklists"
          element={
            <AdminRoute>
              <AdminChecklists />
            </AdminRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
