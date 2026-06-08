import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useDashboard } from '../hooks/useDashboard'
import { useJointMisc } from '../hooks/useJointMisc'
import { currency } from '../utils/format'
import { t } from '../utils/theme'
import { getCurrentPeriod, getPrevPeriod, getNextPeriod, getPeriodLabel, getPeriodShortRange, getPeriodDateRange } from '../utils/payCycle'
import { ensureSnapshot } from '../utils/snapshotGuard'
import { sumAmount } from '../utils/calculations'
import JointFixed    from '../components/joint/JointFixed'
import JointVariable from '../components/joint/JointVariable'
import JointMisc    from '../components/joint/JointMisc'
import JointSavings  from '../components/joint/JointSavings'
import JointReports  from '../components/joint/JointReports'
import JointNotebook from '../components/joint/JointNotebook'

const TABS = ['Overview', 'Reports', 'Notebook']

function TabBar({ active, onChange }) {
  return (
    <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: 'rgba(128,128,128,0.08)' }}>
      {TABS.map(tab => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className="flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors"
          style={{
            backgroundColor: active === tab ? t.surface : 'transparent',
            color: active === tab ? t.textPrimary : t.textMuted,
          }}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}

function PeriodNav({ period, onChange }) {
  const current = getCurrentPeriod()
  const isCurrentPeriod = period === current

  return (
    <div className="flex items-center justify-between px-1">
      <button
        onClick={() => onChange(getPrevPeriod(period))}
        className="p-2 rounded-lg"
        style={{ color: t.textMuted }}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div className="text-center">
        <p className="text-sm font-bold" style={{ color: t.textPrimary }}>{getPeriodLabel(period)}</p>
        <p className="text-xs" style={{ color: t.textMuted }}>{getPeriodShortRange(period)}</p>
      </div>

      <button
        onClick={() => onChange(getNextPeriod(period))}
        className="p-2 rounded-lg"
        style={{ color: isCurrentPeriod ? 'transparent' : t.textMuted }}
        disabled={isCurrentPeriod}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  )
}

function JointRemaining({ derived, period }) {
  const { start, end } = getPeriodDateRange(period)
  const { items: miscItems } = useJointMisc()

  if (!derived) return null

  const { totalIn, fixedTotal, varBudget } = derived
  const miscPeriodTotal = sumAmount(miscItems.filter(i =>
    i.expense_date >= start && i.expense_date <= end &&
    i.deduction_type !== 'variable'  // already counted in var spending — avoid double-counting
  ))
  const balance  = totalIn - fixedTotal - varBudget - miscPeriodTotal
  const positive = balance >= 0

  return (
    <div
      className="rounded-2xl px-5 py-4"
      style={{
        backgroundColor: positive ? 'rgba(52,211,153,0.08)' : 'rgba(244,63,94,0.08)',
        border: `1px solid ${positive ? 'rgba(52,211,153,0.20)' : 'rgba(244,63,94,0.20)'}`,
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: positive ? t.green : t.red }}>
        Joint {positive ? 'surplus' : 'deficit'} this period
      </p>
      <p className="text-3xl font-bold tracking-tight tabular-nums" style={{ color: positive ? t.green : t.red }}>
        {positive ? '+' : '−'}{currency(Math.abs(balance))}
      </p>
      <div className="flex gap-4 mt-2.5 flex-wrap">
        <span className="text-xs" style={{ color: t.textMuted }}>In <span className="font-semibold" style={{ color: t.textSecondary }}>{currency(totalIn)}</span></span>
        <span className="text-xs" style={{ color: t.textMuted }}>Fixed <span className="font-semibold" style={{ color: t.textSecondary }}>−{currency(fixedTotal)}</span></span>
        <span className="text-xs" style={{ color: t.textMuted }}>Var <span className="font-semibold" style={{ color: t.textSecondary }}>−{currency(varBudget)}</span></span>
        {miscPeriodTotal > 0 && <span className="text-xs" style={{ color: t.textMuted }}>Misc <span className="font-semibold" style={{ color: t.textSecondary }}>−{currency(miscPeriodTotal)}</span></span>}
      </div>
    </div>
  )
}

export default function JointPage() {
  const [tab,    setTab]    = useState('Overview')
  const [period, setPeriod] = useState(getCurrentPeriod)
  const { derived, loading } = useDashboard()
  const { session } = useAuth()
  const userId = session?.user?.id

  // Feature 2: auto-snapshot on first activity in new period
  useEffect(() => {
    if (userId) ensureSnapshot(userId)
  }, [userId])

  return (
    <div className="space-y-3">
      <div className="pt-2 pb-1">
        <p className="text-xl font-bold" style={{ color: t.textPrimary }}>Joint finances</p>
      </div>

      <TabBar active={tab} onChange={setTab} />

      {(tab === 'Overview' || tab === 'Reports') && (
        <PeriodNav period={period} onChange={setPeriod} />
      )}

      {tab === 'Overview' && (
        <div className="space-y-3">
          {!loading && <JointRemaining derived={derived} period={period} />}
          <JointFixed period={period} />
          <JointVariable period={period} />
          <JointMisc period={period} />
          <JointSavings />
        </div>
      )}

      {tab === 'Reports'  && <JointReports period={period} />}
      {tab === 'Notebook' && <JointNotebook />}
    </div>
  )
}
