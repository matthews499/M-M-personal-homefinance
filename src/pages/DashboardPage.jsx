import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDashboard } from '../hooks/useDashboard'
import { useTransfers } from '../hooks/useTransfers'
import { currency, greeting } from '../utils/format'
import { monthLabel, ordinal } from '../utils/dates'
import { t, cardStyle, surfaceStyle, inputStyle } from '../utils/theme'
import { getPeriodLabel, getCurrentPeriod } from '../utils/payCycle'
import { TasksSection } from '../components/dashboard/TasksSection'
import { ensureContributionTasks } from '../utils/taskGuard'

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
  return <div className="w-10 h-1 rounded-full mx-auto mb-2 md:hidden" style={{ backgroundColor: 'rgba(128,128,128,0.3)' }} />
}

// ── Edit profile modal ───────────────────────────────────────────

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
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-medium" style={{ backgroundColor: 'var(--color-pill-bg)', color: t.textSecondary }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-50" style={{ backgroundColor: t.purple, color: '#fff' }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Split ratio modal ────────────────────────────────────────────

function SplitModal({ ratio, isLocked, onSave, onUnlock, onClose }) {
  const [matthewPct, setMatthewPct] = useState(Math.round(ratio * 100))
  const [saving,     setSaving]     = useState(false)
  const maddyPct = 100 - matthewPct

  async function handleSave() {
    setSaving(true)
    try { await onSave(matthewPct / 100); onClose() }
    finally { setSaving(false) }
  }

  if (isLocked) {
    return (
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }} onClick={onClose}>
        <div className="w-full md:max-w-sm rounded-t-3xl md:rounded-2xl p-6 pb-10 md:pb-6 space-y-4" style={{ backgroundColor: t.card, border: `1px solid ${t.cardBorder}` }} onClick={e => e.stopPropagation()}>
          <SheetHandle />
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: t.amberDim }}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: t.amber }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-base font-bold" style={{ color: t.textPrimary }}>Split is locked</h2>
            <p className="text-sm text-center" style={{ color: t.textMuted }}>The disposable income split is locked to prevent accidental changes.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-medium" style={{ backgroundColor: 'var(--color-pill-bg)', color: t.textSecondary }}>Close</button>
            <button onClick={onUnlock} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ backgroundColor: t.amberDim, color: t.amber }}>Unlock</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }} onClick={onClose}>
      <div className="w-full md:max-w-sm rounded-t-3xl md:rounded-2xl p-6 pb-10 md:pb-6 space-y-5" style={{ backgroundColor: t.card, border: `1px solid ${t.cardBorder}` }} onClick={e => e.stopPropagation()}>
        <SheetHandle />
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-bold" style={{ color: t.textPrimary }}>Disposable income split</h2>
            <p className="text-xs mt-1" style={{ color: t.textMuted }}>How the joint surplus is shared between you.</p>
          </div>
          <button
            onClick={onUnlock}
            className="p-2 rounded-lg -mt-1"
            style={{ color: t.textMuted }}
            title="Lock split"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
          </button>
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
        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(128,128,128,0.15)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${matthewPct}%`, backgroundColor: t.purple }} />
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-medium" style={{ backgroundColor: 'var(--color-pill-bg)', color: t.textSecondary }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-50" style={{ backgroundColor: t.purple, color: '#fff' }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── What-if calculator ───────────────────────────────────────────

const AMBER_BG    = 'rgba(251,146,60,0.10)'
const AMBER_BORD  = 'rgba(251,146,60,0.30)'
const AMBER_INPUT = { backgroundColor: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.25)', color: 'var(--color-text-primary)' }

function WhatIfModal({ derived, onClose }) {
  const { matthew, maddy, fixedTotal, varBudget, matthewRatio } = derived

  const [mSalary,  setMSalary]  = useState(String(matthew.salary))
  const [dSalary,  setDSalary]  = useState(String(maddy.salary))
  const [mFixed,   setMFixed]   = useState(String(matthew.personal_fixed_total))
  const [dFixed,   setDFixed]   = useState(String(maddy.personal_fixed_total))
  const [mPct,     setMPct]     = useState(Math.round(matthewRatio * 100))

  // Correct model: available = salary − personal_fixed
  //                totalDisposable = totalAvailable − jointCosts
  //                disposable = totalDisposable × ratio
  //                contribution = available − disposable
  const mAvail      = (parseFloat(mSalary) || 0) - (parseFloat(mFixed) || 0)
  const dAvail      = (parseFloat(dSalary) || 0) - (parseFloat(dFixed) || 0)
  const totalAvail  = mAvail + dAvail
  const totalDisp   = totalAvail - fixedTotal - varBudget
  const mDisp       = totalDisp * (mPct / 100)
  const dDisp       = totalDisp * (1 - mPct / 100)
  const mContrib    = mAvail - mDisp
  const dContrib    = dAvail - dDisp
  const totalIn     = mContrib + dContrib
  const positive    = totalDisp >= 0

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }} onClick={onClose}>
      <div
        className="w-full md:max-w-sm rounded-t-3xl md:rounded-2xl overflow-hidden"
        style={{ backgroundColor: t.card, border: `1px solid ${AMBER_BORD}`, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 0 0 1px rgba(251,146,60,0.15), 0 24px 64px rgba(0,0,0,0.6)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Persistent simulation mode banner */}
        <div className="flex items-center gap-2 px-5 py-3" style={{ backgroundColor: 'rgba(251,146,60,0.15)', borderBottom: `1px solid ${AMBER_BORD}` }}>
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: t.amber }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="text-xs font-semibold" style={{ color: t.amber }}>Simulation mode — no data will be saved</p>
        </div>

        <div className="p-6 pb-10 md:pb-6 space-y-5">
          <SheetHandle />
          <div>
            <h2 className="text-base font-bold" style={{ color: t.amber }}>What-if calculator</h2>
            <p className="text-xs mt-1" style={{ color: t.textMuted }}>Adjust values to model different scenarios.</p>
          </div>

          {/* Inputs */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: t.amber }}>Matthew</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs mb-1.5" style={{ color: t.textMuted }}>Salary (£)</p>
                <input type="number" value={mSalary} onChange={e => setMSalary(e.target.value)} className="w-full px-3 py-3 rounded-xl text-base outline-none" style={{ ...AMBER_INPUT, borderRadius: '0.75rem' }} />
              </div>
              <div>
                <p className="text-xs mb-1.5" style={{ color: t.textMuted }}>Personal fixed (£)</p>
                <input type="number" value={mFixed} onChange={e => setMFixed(e.target.value)} className="w-full px-3 py-3 rounded-xl text-base outline-none" style={{ ...AMBER_INPUT, borderRadius: '0.75rem' }} />
              </div>
            </div>

            <p className="text-xs font-semibold uppercase tracking-widest pt-1" style={{ color: t.amber }}>Maddy</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs mb-1.5" style={{ color: t.textMuted }}>Salary (£)</p>
                <input type="number" value={dSalary} onChange={e => setDSalary(e.target.value)} className="w-full px-3 py-3 rounded-xl text-base outline-none" style={{ ...AMBER_INPUT, borderRadius: '0.75rem' }} />
              </div>
              <div>
                <p className="text-xs mb-1.5" style={{ color: t.textMuted }}>Personal fixed (£)</p>
                <input type="number" value={dFixed} onChange={e => setDFixed(e.target.value)} className="w-full px-3 py-3 rounded-xl text-base outline-none" style={{ ...AMBER_INPUT, borderRadius: '0.75rem' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: t.amber }}>Matthew's split</p>
                <span className="text-xs font-bold tabular-nums" style={{ color: t.amber }}>{mPct}% / {100 - mPct}%</span>
              </div>
              <input type="range" min={0} max={100} value={mPct} onChange={e => setMPct(Number(e.target.value))} className="w-full accent-orange-400" />
            </div>
          </div>

          {/* Results */}
          <div className="rounded-xl p-4 space-y-2.5" style={{ backgroundColor: positive ? 'rgba(52,211,153,0.08)' : 'rgba(244,63,94,0.08)', border: `1px solid ${positive ? 'rgba(52,211,153,0.20)' : 'rgba(244,63,94,0.20)'}` }}>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: positive ? t.green : t.red }}>Projected outcome</p>

            <div className="flex justify-between">
              <span className="text-sm" style={{ color: t.textSecondary }}>Total available</span>
              <span className="text-sm font-semibold tabular-nums" style={{ color: t.textPrimary }}>{currency(totalAvail)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm" style={{ color: t.textSecondary }}>Fixed outgoings</span>
              <span className="text-sm font-semibold tabular-nums" style={{ color: t.red }}>−{currency(fixedTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm" style={{ color: t.textSecondary }}>Variable budget</span>
              <span className="text-sm font-semibold tabular-nums" style={{ color: t.red }}>−{currency(varBudget)}</span>
            </div>
            <div className="flex justify-between pt-1" style={{ borderTop: `1px solid ${t.divider}` }}>
              <span className="text-sm font-semibold" style={{ color: t.textPrimary }}>Total disposable</span>
              <span className="text-base font-bold tabular-nums" style={{ color: positive ? t.green : t.red }}>{currency(totalDisp)}</span>
            </div>

            {/* Per-person breakdown */}
            <div className="space-y-1.5 pt-1" style={{ borderTop: `1px solid ${t.divider}` }}>
              {[
                { name: 'Matthew', avail: mAvail, disp: mDisp, contrib: mContrib },
                { name: 'Maddy',   avail: dAvail, disp: dDisp, contrib: dContrib },
              ].map(p => (
                <div key={p.name} className="rounded-lg px-3 py-2" style={{ background: 'rgba(128,128,128,0.06)' }}>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: t.textMuted }}>{p.name}</p>
                  <div className="flex justify-between"><span className="text-xs" style={{ color: t.textSecondary }}>Available</span><span className="text-xs font-semibold tabular-nums" style={{ color: t.textPrimary }}>{currency(p.avail)}</span></div>
                  <div className="flex justify-between"><span className="text-xs" style={{ color: t.textSecondary }}>Disposable ({p.name === 'Matthew' ? mPct : 100 - mPct}%)</span><span className="text-xs font-semibold tabular-nums" style={{ color: p.disp >= 0 ? t.green : t.red }}>{currency(p.disp)}</span></div>
                  <div className="flex justify-between"><span className="text-xs" style={{ color: t.textSecondary }}>Contribution</span><span className="text-xs font-semibold tabular-nums" style={{ color: p.contrib >= 0 ? t.textPrimary : t.red }}>{currency(p.contrib)}</span></div>
                </div>
              ))}
            </div>
          </div>

          <button onClick={onClose} className="w-full py-3 rounded-xl text-sm font-semibold" style={{ backgroundColor: 'rgba(251,146,60,0.15)', color: t.amber }}>Close</button>
        </div>
      </div>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate()
  const { derived, loading, updateProfile, updateSplitRatio } = useDashboard()
  const { transfers, transferNetForUser } = useTransfers()
  const [editProfile, setEditProfile] = useState(false)
  const [editSplit,   setEditSplit]   = useState(false)
  const [showWhatIf,  setShowWhatIf]  = useState(false)
  const [splitLocked, setSplitLocked] = useState(() => localStorage.getItem('splitLocked') === 'true')

  // Must be above any early returns — hooks must always run in the same order
  useEffect(() => { ensureContributionTasks() }, [])

  function toggleSplitLock() {
    const next = !splitLocked
    setSplitLocked(next)
    localStorage.setItem('splitLocked', String(next))
  }

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

  const {
    me, partner, matthew, maddy,
    combinedIncome, totalIn, fixedTotal, varBudget, miscThisMonth,
    jointBalance, myDisposable, matthewRatio, maddyRatio, isMatthew,
    matthewDisposable, maddyDisposable,
    matthewAvailable, maddyAvailable,
    matthewContribution, maddyContribution,
    matthewSummary, maddySummary,
  } = derived
  const surplus = jointBalance >= 0
  const period = getCurrentPeriod()

  // Transfer net adjustments
  const transferNet         = transferNetForUser(period, me.user_id)
  const matthewTransferNet  = transferNetForUser(period, matthew.user_id)
  const maddyTransferNet    = transferNetForUser(period, maddy.user_id)
  const adjustedDisposable  = myDisposable + transferNet

  // Remaining this period for each person
  const matthewRemaining = matthewDisposable + matthewTransferNet
    - Number(matthewSummary.var_spent ?? 0) - Number(matthewSummary.misc_total ?? 0)
  const maddyRemaining = maddyDisposable + maddyTransferNet
    - Number(maddySummary.var_spent ?? 0) - Number(maddySummary.misc_total ?? 0)

  // Recent transfers for this period (last 5)
  const recentTransfers = transfers.filter(tr => tr.period === period).slice(0, 5)

  return (
    <div className="space-y-3">

      {/* Greeting */}
      <div className="pt-1 pb-1 flex items-start justify-between">
        <div>
          <p className="text-xl font-bold" style={{ color: t.textPrimary }}>{greeting(me.name)}</p>
          <p className="text-sm mt-0.5" style={{ color: t.textMuted }}>{getPeriodLabel(period)}</p>
        </div>
        {/* What-if calculator button */}
        <button
          onClick={() => setShowWhatIf(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold mt-1"
          style={{ backgroundColor: t.violetBg, color: t.violet }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          What-if
        </button>
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
        {[
          { person: matthew, available: matthewAvailable, contribution: matthewContribution, disposable: matthewDisposable, isMe: isMatthew },
          { person: maddy,   available: maddyAvailable,   contribution: maddyContribution,   disposable: maddyDisposable,   isMe: !isMatthew },
        ].map(({ person, available, contribution, disposable, isMe }) => (
          <div
            key={person.user_id}
            className="rounded-2xl p-4 transition-colors active:brightness-90"
            style={{ ...cardStyle, cursor: isMe ? 'pointer' : 'default' }}
            onClick={isMe ? () => setEditProfile(true) : undefined}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: t.textMuted }}>{person.name}</p>
              {isMe && (
                <svg className="w-3.5 h-3.5" style={{ color: t.textMuted }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-3 1 1-3a4 4 0 01.828-1.414z" />
                </svg>
              )}
            </div>

            <div className="space-y-2.5" style={{ borderTop: `1px solid ${t.divider}`, paddingTop: '10px' }}>
              <div>
                <p className="text-xs mb-0.5" style={{ color: t.textMuted }}>Available</p>
                <p className="text-base font-bold tabular-nums" style={{ color: t.textPrimary }}>{currency(available)}</p>
                <p className="text-[10px] mt-0.5" style={{ color: t.textMuted }}>salary − personal fixed</p>
              </div>
              <div style={{ borderTop: `1px solid ${t.divider}`, paddingTop: '8px' }}>
                <p className="text-xs mb-0.5" style={{ color: t.textMuted }}>Contribution</p>
                <p className="text-sm font-bold tabular-nums" style={{ color: contribution >= 0 ? t.textPrimary : t.red }}>{currency(contribution)}</p>
              </div>
              <div style={{ borderTop: `1px solid ${t.divider}`, paddingTop: '8px' }}>
                <p className="text-xs mb-0.5" style={{ color: t.textMuted }}>Disposable</p>
                <p className="text-sm font-bold tabular-nums" style={{ color: t.green }}>{currency(disposable)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Joint pot ── */}
      <div className="rounded-2xl p-5 cursor-pointer active:brightness-90" style={cardStyle} onClick={() => navigate('/joint')}>
        <div className="flex items-center justify-between mb-4">
          <Label>Joint pot — {getPeriodLabel(period)}</Label>
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

      {/* ── Remaining this period ── */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Matthew', remaining: matthewRemaining },
          { label: 'Maddy',   remaining: maddyRemaining   },
        ].map(({ label, remaining }) => (
          <div key={label} className="rounded-2xl p-4" style={cardStyle}>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: t.textMuted }}>{label}</p>
            <p
              className="text-2xl font-bold tabular-nums"
              style={{ color: remaining >= 0 ? t.green : t.red }}
            >
              {currency(remaining)}
            </p>
            <p className="text-[10px] mt-1" style={{ color: t.textMuted }}>remaining this period</p>
          </div>
        ))}
      </div>

      {/* ── Tasks ── */}
      <TasksSection />

      {/* ── My disposable income ── */}
      <div
        className="rounded-2xl p-5 cursor-pointer active:brightness-90"
        style={cardStyle}
        onClick={() => setEditSplit(true)}
      >
        <div className="flex items-center justify-between">
          <div>
            <Label>Your disposable income</Label>
            <p className="text-3xl font-bold tracking-tight tabular-nums mt-2" style={{ color: adjustedDisposable >= 0 ? t.green : t.red }}>
              {currency(adjustedDisposable)}
            </p>
            <p className="text-xs mt-2" style={{ color: t.textMuted }}>
              {isMatthew ? `${Math.round(matthewRatio * 100)}%` : `${Math.round(maddyRatio * 100)}%`} of joint surplus
              {transferNet !== 0 && (
                <span style={{ color: transferNet > 0 ? t.green : t.red }}>
                  {transferNet > 0 ? ` · +${currency(transferNet)} received` : ` · −${currency(Math.abs(transferNet))} sent`}
                </span>
              )}
            </p>
          </div>
          {/* Lock icon */}
          <div className="shrink-0 ml-3 flex flex-col items-center gap-1">
            {splitLocked ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: t.amber }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: t.textMuted }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
            )}
            <span className="text-[9px] font-semibold" style={{ color: splitLocked ? t.amber : t.textMuted }}>
              {splitLocked ? 'locked' : 'tap to edit'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Recent transfers ── */}
      {recentTransfers.length > 0 && (
        <div className="rounded-2xl p-5" style={cardStyle}>
          <Label>Recent transfers — {getPeriodLabel(period)}</Label>
          <div className="mt-3 space-y-0">
            {recentTransfers.map(tr => {
              const isSender = tr.sender_id === me.user_id
              return (
                <div key={tr.id} className="flex items-center justify-between py-2.5" style={{ borderBottom: `1px solid ${t.divider}` }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate" style={{ color: t.textPrimary }}>
                      {isSender ? `To ${tr.recipient?.name ?? 'other'}` : `From ${tr.sender?.name ?? 'other'}`}
                    </p>
                    {tr.note && <p className="text-xs mt-0.5 truncate" style={{ color: t.textMuted }}>{tr.note}</p>}
                    <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>{tr.transfer_date}</p>
                  </div>
                  <span className="text-sm font-bold tabular-nums ml-3" style={{ color: isSender ? t.red : t.green }}>
                    {isSender ? '−' : '+'}{currency(tr.amount)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

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
        <SplitModal
          ratio={matthewRatio}
          isLocked={splitLocked}
          onSave={updateSplitRatio}
          onUnlock={toggleSplitLock}
          onClose={() => setEditSplit(false)}
        />
      )}

      {showWhatIf && derived && (
        <WhatIfModal derived={derived} onClose={() => setShowWhatIf(false)} />
      )}
    </div>
  )
}
