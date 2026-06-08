import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useDashboard } from '../hooks/useDashboard'
import { useJointMisc } from '../hooks/useJointMisc'
import { useJointVariable } from '../hooks/useJointVariable'
import { currency } from '../utils/format'
import { t } from '../utils/theme'
import { getCurrentPeriod, getPrevPeriod, getNextPeriod, getPeriodLabel, getPeriodShortRange, getPeriodDateRange } from '../utils/payCycle'
import { ensureSnapshot } from '../utils/snapshotGuard'
import { sumAmount } from '../utils/calculations'
import { checkJointBudgetAlerts } from '../utils/checkJointBudgetAlerts'
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

/**
 * Combined joint variable budget card.
 *
 * Total budget  = Σ variable category budgets + variable-type misc this period
 * Amount spent  = Σ joint_transactions this period + variable-type misc this period
 * Remaining     = total budget − amount spent
 *
 * Variable misc appears in both budget and spent so it is "neutral" to the
 * remaining figure, but widens the progress bar denominator to show a more
 * accurate % picture.  Personal-type misc is excluded entirely (handled via
 * tasks for individual repayment).
 *
 * Progress bar: green 0–50%, amber 50–80%, red 80%+
 * Threshold alerts (bell + email) at 50%, 80%, 100% for both users.
 */
function JointBudgetCard({ period }) {
  const { start, end } = getPeriodDateRange(period)
  const { categories, transactions, loading: varLoading } = useJointVariable(period)
  const { items: miscItems, loading: miscLoading }         = useJointMisc()

  const loading = varLoading || miscLoading

  // Variable-type misc in this period (NOT personal deductions)
  const variableMisc = sumAmount(
    miscItems.filter(i =>
      i.expense_date >= start && i.expense_date <= end &&
      i.deduction_type === 'variable'
    )
  )

  // Actual category spending this period (from joint_transactions)
  const categorySpent = sumAmount(
    transactions.filter(i =>
      i.transaction_date >= start && i.transaction_date <= end
    )
  )

  const varBudget   = categories.reduce((acc, c) => acc + Number(c.monthly_budget), 0)
  const totalBudget = varBudget + variableMisc
  const totalSpent  = categorySpent + variableMisc
  const remaining   = totalBudget - totalSpent
  const positive    = remaining >= 0

  const spentPct = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0
  const barColor = spentPct >= 80 ? t.red : spentPct >= 50 ? t.amber : t.green

  // Check threshold alerts when data is ready
  useEffect(() => {
    if (loading || totalBudget <= 0) return
    checkJointBudgetAlerts({ period, totalBudget, totalSpent })
  }, [period, totalBudget, totalSpent, loading])

  if (loading) {
    return (
      <div className="rounded-2xl px-5 py-4" style={{ backgroundColor: 'rgba(129,140,248,0.06)', border: '1px solid rgba(129,140,248,0.15)' }}>
        <p className="text-xs" style={{ color: t.textMuted }}>Loading…</p>
      </div>
    )
  }

  return (
    <div
      className="rounded-2xl px-5 py-4 space-y-3"
      style={{
        backgroundColor: positive ? 'rgba(52,211,153,0.08)' : 'rgba(244,63,94,0.08)',
        border: `1px solid ${positive ? 'rgba(52,211,153,0.20)' : 'rgba(244,63,94,0.20)'}`,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: positive ? t.green : t.red }}>
            Joint variable budget
          </p>
          <p className="text-3xl font-bold tracking-tight tabular-nums" style={{ color: positive ? t.green : t.red }}>
            {currency(remaining)}
          </p>
          <p className="text-xs mt-1" style={{ color: t.textMuted }}>remaining</p>
        </div>
        <div className="text-right mt-1">
          <p className="text-2xl font-bold tabular-nums" style={{ color: spentPct >= 80 ? t.red : spentPct >= 50 ? t.amber : t.textMuted }}>
            {Math.round(spentPct)}%
          </p>
          <p className="text-[10px]" style={{ color: t.textMuted }}>of budget spent</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(128,128,128,0.15)' }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${spentPct}%`, backgroundColor: barColor }}
        />
      </div>

      {/* Breakdown */}
      <div className="flex gap-4 flex-wrap">
        <span className="text-xs" style={{ color: t.textMuted }}>
          Budget <span className="font-semibold" style={{ color: t.textSecondary }}>{currency(totalBudget)}</span>
        </span>
        <span className="text-xs" style={{ color: t.textMuted }}>
          Spent <span className="font-semibold" style={{ color: t.textSecondary }}>{currency(totalSpent)}</span>
        </span>
        {variableMisc > 0 && (
          <span className="text-xs" style={{ color: t.textMuted }}>
            Misc <span className="font-semibold" style={{ color: t.textSecondary }}>{currency(variableMisc)}</span>
          </span>
        )}
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
          <JointBudgetCard period={period} />
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
