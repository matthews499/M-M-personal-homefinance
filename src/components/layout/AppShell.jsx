import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabase'
import { useNavigate, useLocation } from 'react-router-dom'
import { t, inputStyle } from '../../utils/theme'

// ── Theme helpers ────────────────────────────────────────────────

function initTheme() {
  const stored = localStorage.getItem('theme') ?? 'dark'
  if (stored === 'light') document.documentElement.classList.add('light')
  else document.documentElement.classList.remove('light')
  return stored
}

function ChangePasswordModal({ onClose }) {
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [saving,    setSaving]    = useState(false)
  const [err,       setErr]       = useState(null)
  const [success,   setSuccess]   = useState(false)

  async function handleSave() {
    setErr(null)
    if (password.length < 6)  { setErr('Password must be at least 6 characters.'); return }
    if (password !== confirm)  { setErr('Passwords do not match.'); return }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (error) { setErr(error.message); return }
    setSuccess(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }} onClick={onClose}>
      <div className="w-full md:max-w-sm rounded-t-3xl md:rounded-2xl p-6 pb-10 md:pb-6 space-y-4" style={{ backgroundColor: t.card, border: `1px solid ${t.cardBorder}` }} onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full mx-auto mb-2 md:hidden" style={{ backgroundColor: 'rgba(128,128,128,0.3)' }} />
        <h2 className="text-base font-bold" style={{ color: t.textPrimary }}>Change password</h2>

        {success ? (
          <div className="space-y-4">
            <p className="text-sm px-3 py-2.5 rounded-xl" style={{ backgroundColor: t.greenDim, color: t.green }}>
              Password updated successfully.
            </p>
            <button onClick={onClose} className="w-full py-3 rounded-xl text-sm font-semibold" style={{ backgroundColor: t.purple, color: '#fff' }}>Done</button>
          </div>
        ) : (
          <>
            <div>
              <p className="text-xs font-medium uppercase tracking-widest mb-1.5" style={{ color: t.textMuted }}>New password</p>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoFocus className="w-full px-3 py-3 rounded-xl text-base outline-none focus:ring-1 focus:ring-violet-500" style={inputStyle} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-widest mb-1.5" style={{ color: t.textMuted }}>Confirm password</p>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSave()} className="w-full px-3 py-3 rounded-xl text-base outline-none focus:ring-1 focus:ring-violet-500" style={inputStyle} />
            </div>
            {err && <p className="text-xs px-3 py-2.5 rounded-xl" style={{ backgroundColor: t.redDim, color: t.red }}>{err}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-medium" style={{ backgroundColor: 'var(--color-pill-bg)', color: t.textSecondary }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-50" style={{ backgroundColor: t.purple, color: '#fff' }}>
                {saving ? 'Saving…' : 'Update'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Nav icons ────────────────────────────────────────────────────
function HomeIcon({ active }) {
  return (
    <svg className="w-5 h-5 mb-0.5" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )
}
function JointIcon({ active }) {
  return (
    <svg className="w-5 h-5 mb-0.5" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5.916-3.516M9 20H4v-2a4 4 0 015.916-3.516M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}
function PersonalIcon({ active }) {
  return (
    <svg className="w-5 h-5 mb-0.5" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}

const NAV_ICONS = { '/': HomeIcon, '/joint': JointIcon, '/personal': PersonalIcon }

// ── Theme toggle icon ────────────────────────────────────────────
function ThemeToggleIcon({ isDark }) {
  return isDark ? (
    // Sun icon (click to go light)
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 110 10A5 5 0 0112 7z" />
    </svg>
  ) : (
    // Moon icon (click to go dark)
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  )
}

export default function AppShell({ children }) {
  const { profile, signOut } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const [changingPassword, setChangingPassword] = useState(false)
  const [theme, setTheme] = useState(() => initTheme())

  // Apply theme on mount in case localStorage has a value
  useEffect(() => { initTheme() }, [])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('theme', next)
    if (next === 'light') document.documentElement.classList.add('light')
    else document.documentElement.classList.remove('light')
  }

  const navItems = [
    { label: 'Home',     path: '/' },
    { label: 'Joint',    path: '/joint' },
    { label: 'Personal', path: '/personal' },
  ]

  return (
    <div className="min-h-screen" style={{ backgroundColor: t.page, color: t.textPrimary }}>
      {/* Top bar */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4 md:px-8 h-14"
        style={{ backgroundColor: t.page, borderBottom: `1px solid ${t.divider}` }}
      >
        <div className="flex items-center gap-6">
          <span className="text-sm font-bold tracking-tight" style={{ color: t.textPrimary }}>M&amp;M</span>
          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {navItems.map(item => {
              const active = location.pathname === item.path
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: active ? 'rgba(128,128,128,0.12)' : 'transparent',
                    color: active ? t.textPrimary : t.textMuted,
                  }}
                >
                  {item.label}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg transition-colors"
            style={{ color: t.textMuted }}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <ThemeToggleIcon isDark={theme === 'dark'} />
          </button>

          {profile && (
            <button
              onClick={() => setChangingPassword(true)}
              className="text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: t.textSecondary }}
              title="Change password"
            >
              {profile.name}
            </button>
          )}
          <button
            onClick={signOut}
            className="hidden md:block text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
            style={{ backgroundColor: 'var(--color-pill-bg)', color: t.textMuted }}
          >
            Sign out
          </button>
          {/* Mobile sign out */}
          <button
            onClick={signOut}
            className="md:hidden p-2 rounded-lg"
            style={{ color: t.textMuted }}
            title="Sign out"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex"
        style={{
          backgroundColor: t.page,
          borderTop: `1px solid ${t.divider}`,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {navItems.map(item => {
          const active = location.pathname === item.path
          const Icon   = NAV_ICONS[item.path]
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex-1 flex flex-col items-center justify-center pt-2 pb-1 min-h-[52px] text-[10px] font-semibold tracking-wide transition-colors"
              style={{ color: active ? t.textPrimary : t.textMuted }}
            >
              <Icon active={active} />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Page content */}
      <main className="max-w-2xl mx-auto px-4 md:px-6 py-5 pb-28 md:pb-10">
        {children}
      </main>

      {changingPassword && <ChangePasswordModal onClose={() => setChangingPassword(false)} />}
    </div>
  )
}
