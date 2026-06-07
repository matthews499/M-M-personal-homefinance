import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { t, inputStyle } from '../utils/theme'

export default function LoginPage() {
  const { signIn } = useAuth()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState(null)
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: t.page }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <p className="text-2xl font-bold tracking-tight" style={{ color: t.textPrimary }}>M&amp;M</p>
          <p className="text-sm mt-1.5" style={{ color: t.textMuted }}>Sign in to your finances</p>
        </div>

        <div className="rounded-2xl p-6 space-y-4" style={{ backgroundColor: t.card, border: `1px solid ${t.cardBorder}` }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: t.textMuted }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none focus:ring-1 focus:ring-violet-500"
                style={inputStyle}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: t.textMuted }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none focus:ring-1 focus:ring-violet-500"
                style={inputStyle}
              />
            </div>

            {error && (
              <p className="text-xs px-3 py-2.5 rounded-xl" style={{ backgroundColor: 'rgba(244,63,94,0.1)', color: t.red }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-opacity mt-2"
              style={{ backgroundColor: t.purple, color: '#fff' }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
