import { lazy, Suspense, type ReactNode } from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import AppShell from './components/AppShell/AppShell'
import LoadingSpinner from './components/shared/LoadingSpinner'
import LoginPage from './pages/LoginPage'

// Lazy-load the authed pages so the practice path's first paint doesn't ship
// History, Settings, and the whole Admin section. LoginPage stays eager — it's
// the unauthenticated entry point.
const HomePage = lazy(() => import('./pages/HomePage'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const AdminUserDetailPage = lazy(() => import('./pages/AdminUserDetailPage'))
const AdminLayout = lazy(() => import('./components/Admin/AdminLayout'))

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
              <Suspense fallback={<LoadingSpinner />}>
                <Outlet />
              </Suspense>
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
