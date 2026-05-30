import type { ReactNode } from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import AppShell from './components/AppShell/AppShell'
import LoadingSpinner from './components/shared/LoadingSpinner'
import HomePage from './pages/HomePage'
import HistoryPage from './pages/HistoryPage'
import SettingsPage from './pages/SettingsPage'
import AdminPage from './pages/AdminPage'
import AdminUserDetailPage from './pages/AdminUserDetailPage'
import AdminLayout from './components/Admin/AdminLayout'
import LoginPage from './pages/LoginPage'

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  if (!user) return <Navigate to='/login' replace />
  return <>{children}</>
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAdmin, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  if (!isAdmin) return <Navigate to='/' replace />
  return <>{children}</>
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path='/login' element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <AppShell>
              <Outlet />
            </AppShell>
          </RequireAuth>
        }
      >
        <Route path='/' element={<HomePage />} />
        <Route path='/history' element={<HistoryPage />} />
        <Route path='/settings' element={<SettingsPage />} />
        <Route
          path='/admin'
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<AdminPage />} />
          <Route path='users/:id' element={<AdminUserDetailPage />} />
        </Route>
      </Route>
      <Route path='*' element={<Navigate to='/' replace />} />
    </Routes>
  )
}
