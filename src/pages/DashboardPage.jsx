import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDashboard } from '../hooks/useDashboard'
import { currency, greeting } from '../utils/format'
import { monthLabel, ordinal } from '../utils/dates'
import { t, cardStyle, surfaceStyle, inputStyle } from '../utils/theme'

function Label({ children }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: t.textMuted }}>
      {children}
    </p>
  )
}

function Divider() {
  return <div style={{ borderBottom: `1px solid ${t.divider}` }} />
}

function Row({ label, value, negative, dim }) {
  return (
    <div className="flex justify-between items-baseline py-2.5" style={{ borderBottom: `1px solid ${t.divider}` }}>
      <span className="text-sm" style={{ color: dim ? t.textMuted : t.textSecondary }}>{label}</span>
      <span className="text-sm font-semibold tabular-nums" style={{ color: negative ? t.red : dim ? t.textMuted : t.textPrimary }}>
        {value}
      </span>
    </div>
  )
}

function SheetHandle() {
  return <div className="w-10 h-1 rounded-full mx-auto mb-2 md:hidden" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
}

// ── Edit profile modal ───────────────────────────────────────

function EditModal({ title, fields, onSave, onClose }) {
  const [values,  setValues]  = useState(() => Object.fromEntries(fields.map(f => [f.key, f.initial ?? ''])))
  const [saving,  setSaving]  = useState(false)
  const [err,     setErr]     = useState(null)

  async function handleSave() {
    setSaving(true); setErr(null)
    try { await onSave(values); onClose() }
    catch (e) { setErr(e.message) }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }} onClick={onClose}>
      <div className="w-full md:max-w-sm rounded-t-3xl md:rounded-2xl p-6 pb-10 md:pb-6 space-y-4" style={{ backgroundColor: t.card, border: `1px solid ${t.cardBorder}` }} onClick={e => e.stopPropagation()}>
        <SheetHandle />
        <h2 className="text-base font-bold" style={{ color: t.textPrimary }}>{title}</h2>
        {fields.map(f => (
          <div key={f.key}>
            <p className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: t.textMuted }}>{f.label}</p>
            <input
              type={f.type ?? 'text'}
              value={values[f.key]}
              onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              className="w-full px-3 py-3 rounded-xl text-base outline-none focus:ring-1 focus:ring-violet-500"
              style={inputStyle}
            />
          </div>
        ))}
        {err && <p className="text-xs" style={{ color: t.red }}>{err}</p>}
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-medium" style={{ backgroundColor: 'rgba(255,255,255,0.07)', color: t.textSecondary }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-50" style={{ backgroundColor: t.purple, color: '#fff' }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Split ratio modal ────────────────────────────────────────

function SplitModal({ ratio, onSave, onClose }) {
  const [matthewPct, setMatthewPct] = useState(Math.round(ratio * 100))
  const [saving,     setSaving]     = useState(false)
  const maddyPct = 100 - matthewPct

  async function handleSave() {
    setSaving(true)
    try { await onSave(matthewPct / 100); onClose() }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }} onClick={onClose}>
      <div className="w-full md:max-w-sm rounded-t-3xl md:rounded-2xl p-6 pb-10 md:pb-6 space-y-5" style={{ backgroundColor: t.card, border: `1px solid ${t.cardBorder}` }} onClick={e => e.stopPropagation()}>
        <SheetHandle />
        <div>
          <h2 className="text-base font-bold" style={{ color: t.textPrimary }}>Disposable income split</h2>
          <p className="text-xs mt-1" style={{ color: t.textMuted }}>How the joint surplus is shared between you.</p>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span style={{ color: t.textSecondary }}>Matthew</span>
            <span className="font-bold tabular-nums" style={{ color: t.textPrimary }}>{matthewPct}%</span>
          </div>
          <input type="range" min={0} max={100} value={matthewPct} onChange={e => setMatthewPct(Number(e.target.value))} className="w-full accent-violet-500" />
          <div className="flex justify-between text-sm">
            <span style={{ color: t.textSecondary }}>Maddy</span>
            <span className="font-bold tabular-nums" style={{ color: t.textPrimary }}>{maddyPct}%</span>
          </div>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${matthewPct}%`, backgroundColor: t.purple }} />
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-medium" style={{ backgroundColor: 'rgba(255,255,255,0.07)', color: t.textSecondary }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-50" style={{ backgroundColor: t.purple, color: '#fff' }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Dashboard ────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate()
  const { derived, loading, updateProfile, updateSplitRatio } = useDashboard()
  const [editProfile, setEditProfile] = useState(false)
  const [editSplit,   setEditSplit]   = useState(false)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <span className="text-sm" style={{ color: t.textMuted }}>Loading…</span>
      </div>
    )
  }

  if (!derived) {
    return (
      <div className="flex items-center justify-center h-48">
        <span className="text-sm" style={{ color: t.textMuted }}>Could not load data.</span>
      </div>
    )
  }

  const { me, partner, combinedIncome, totalIn, fixedTotal, varBudget, miscThisMonth, jointBalance, myDisposable, matthewRatio, maddyRatio, isMatthew, month } = derived
  const surplus = jointBalance >= 0

  return (
    <div className="space-y-3">

      {/* Greeting */}
      <div className="pt-1 pb-1">
        <p className="text-xl font-bold" style={{ color: t.textPrimary }}>{greeting(me.name)}</p>
        <p className="text-sm mt-0.5" style={{ color: t.textMuted }}>{monthLabel()}</p>
      </div>

      {/* ── Combined income ── */}
      <div className="rounded-2xl p-5" style={cardStyle}>
        <Label>Household income</Label>
        <p className="text-4xl font-bold tracking-tight tabular-nums mt-2" style={{ color: t.textPrimary }}>
          {currency(combinedIncome)}
        </p>
        <p className="text-xs mt-2.5" style={{ color: t.textMuted }}>Paid {ordinal(me.pay_date)} of the month</p>
      </div>

      {/* ── Contributor cards ── */}
      <div className="grid grid-cols-2 gap-3">
        {[{ person: me, isMe: true }, { person: partner, isMe: false }].map(({ person, isMe }) => (
          <div
            key={person.user_id}
            className="rounded-2xl p-4 space-y-3 transition-colors active:brightness-90"
            style={{ ...cardStyle, cursor: isMe ? 'pointer' : 'default' }}
            onClick={isMe ? () => setEditProfile(true) : undefined}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: t.textMuted }}>{person.name}</p>
              {isMe && (
                <svg className="w-3.5 h-3.5" style={{ color: t.textMuted }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-3 1 1-3a4 4 0 01.828-1.414z" />
                </svg>
              )}
            </div>

            <div style={{ borderTop: `1px solid ${t.divider}`, paddingTop: '12px' }} className="space-y-2.5">
              <div>
                <p className="text-xs mb-0.5" style={{ color: t.textMuted }}>Salary</p>
                <p className="text-base font-bold tabular-nums" style={{ color: t.textPrimary }}>{currency(person.salary)}</p>
              </div>
              <div>
                <p className="text-xs mb-0.5" style={{ color: t.textMuted }}>Fixed costs</p>
                <p className="text-sm font-semibold tabular-nums" style={{ color: t.red }}>−{currency(person.personal_fixed_total)}</p>
              </div>
              <div style={{ borderTop: `1px solid ${t.divider}`, paddingTop: '10px' }}>
                <p className="text-xs mb-0.5" style={{ color: t.textMuted }}>Contribution</p>
                <p className="text-base font-bold tabular-nums" style={{ color: t.textPrimary }}>{currency(person.contribution)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Joint pot ── */}
      <div className="rounded-2xl p-5 cursor-pointer active:brightness-90" style={cardStyle} onClick={() => navigate('/joint')}>
        <div className="flex items-center justify-between mb-4">
          <Label>Joint pot — {monthLabel()}</Label>
          <svg className="w-4 h-4" style={{ color: t.textMuted }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>

        <Row label="Contributions in"  value={currency(totalIn)} />
        <Row label="Fixed outgoings"   value={`−${currency(fixedTotal)}`}     negative={fixedTotal > 0} />
        <Row label="Variable budget"   value={`−${currency(varBudget)}`}      negative={varBudget > 0} />
        <Row label="Miscellaneous"     value={`−${currency(miscThisMonth)}`}  negative={miscThisMonth > 0} />

        <div className="mt-4 pt-4 flex items-baseline justify-between" style={{ borderTop: `1px solid ${t.divider}` }}>
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: surplus ? '#059669' : '#be123c' }}>
            {surplus ? 'Surplus' : 'Deficit'}
          </span>
          <span className="text-3xl font-bold tracking-tight tabular-nums" style={{ color: surplus ? t.green : t.red }}>
            {surplus ? '+' : '−'}{currency(Math.abs(jointBalance))}
          </span>
        </div>
      </div>

      {/* ── My disposable income ── */}
      <div className="rounded-2xl p-5 cursor-pointer active:brightness-90" style={cardStyle} onClick={() => setEditSplit(true)}>
        <div className="flex items-center justify-between">
          <div>
            <Label>Your disposable income</Label>
            <p className="text-3xl font-bold tracking-tight tabular-nums mt-2" style={{ color: myDisposable >= 0 ? t.green : t.red }}>
              {currency(myDisposable)}
            </p>
            <p className="text-xs mt-2" style={{ color: t.textMuted }}>
              {isMatthew ? `${Math.round(matthewRatio * 100)}%` : `${Math.round(maddyRatio * 100)}%`} of joint surplus · tap to adjust split
            </p>
          </div>
          <svg className="w-4 h-4 shrink-0 ml-3" style={{ color: t.textMuted }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-3 1 1-3a4 4 0 01.828-1.414z" />
          </svg>
        </div>
      </div>

      {/* ── Navigation ── */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <button onClick={() => navigate('/joint')} className="rounded-2xl p-5 text-left transition-all active:scale-[0.98]" style={{ backgroundColor: t.card, border: `1px solid ${t.cardBorder}` }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: t.violetBg }}>
            <svg className="w-4 h-4" style={{ color: t.violet }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5.916-3.516M9 20H4v-2a4 4 0 015.916-3.516M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-sm font-bold" style={{ color: t.textPrimary }}>Joint finances</p>
          <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>Bills, spending & savings</p>
        </button>

        <button onClick={() => navigate('/personal')} className="rounded-2xl p-5 text-left transition-all active:scale-[0.98]" style={{ backgroundColor: t.card, border: `1px solid ${t.cardBorder}` }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: t.greenDim }}>
            <svg className="w-4 h-4" style={{ color: t.green }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <p className="text-sm font-bold" style={{ color: t.textPrimary }}>Personal finances</p>
          <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>Private · yours only</p>
        </button>
      </div>

      {/* Modals */}
      {editProfile && (
        <EditModal
          title="Edit your details"
          fields={[
            { key: 'salary',   label: 'Monthly take-home pay (£)', type: 'number', placeholder: '0.00', initial: me.salary },
            { key: 'pay_date', label: 'Pay date (day of month)',    type: 'number', placeholder: '26',   initial: me.pay_date },
          ]}
          onSave={values => updateProfile(me.user_id, { salary: parseFloat(values.salary), pay_date: parseInt(values.pay_date, 10) })}
          onClose={() => setEditProfile(false)}
        />
      )}

      {editSplit && derived && (
        <SplitModal ratio={matthewRatio} onSave={updateSplitRatio} onClose={() => setEditSplit(false)} />
      )}
    </div>
  )
}
