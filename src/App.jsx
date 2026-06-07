import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/AuthContext'
import LoginPage from './pages/LoginPage'
import DashboardPage  from './pages/DashboardPage'
import JointPage      from './pages/JointPage'
import PersonalPage   from './pages/PersonalPage'
import AppShell       from './components/layout/AppShell'

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#09090b' }}>
      <span className="text-sm" style={{ color: '#52525b' }}>Loading…</span>
    </div>
  )
}

export default function App() {
  const { session } = useAuth()

  if (session === undefined) return <LoadingScreen />
  if (!session) return <LoginPage />

  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/"         element={<DashboardPage />} />
          <Route path="/joint"    element={<JointPage />} />
          <Route path="/personal" element={<PersonalPage />} />
          <Route path="*"         element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  )
}
