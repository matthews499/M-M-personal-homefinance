import { useState } from 'react'
import { useDashboard } from '../hooks/useDashboard'
import { currency } from '../utils/format'
import { monthLabel } from '../utils/dates'
import { t } from '../utils/theme'
import JointFixed   from '../components/joint/JointFixed'
import JointVariable from '../components/joint/JointVariable'
import JointMisc   from '../components/joint/JointMisc'
import JointSavings from '../components/joint/JointSavings'
import JointReports from '../components/joint/JointReports'

function TabBar({ active, onChange }) {
  return (
    <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
      {['Overview', 'Reports'].map(tab => (
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

function JointRemaining({ derived }) {
  if (!derived) return null
  const { jointBalance, totalIn, fixedTotal, varBudget, miscThisMonth } = derived
  const positive = jointBalance >= 0

  return (
    <div
      className="rounded-2xl px-5 py-4"
      style={{
        backgroundColor: positive ? 'rgba(52,211,153,0.08)' : 'rgba(244,63,94,0.08)',
        border: `1px solid ${positive ? 'rgba(52,211,153,0.20)' : 'rgba(244,63,94,0.20)'}`,
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: positive ? t.green : t.red }}>
        Remaining this month
      </p>
      <p className="text-3xl font-bold tracking-tight tabular-nums" style={{ color: positive ? t.green : t.red }}>
        {currency(jointBalance)}
      </p>
      <div className="flex gap-4 mt-2.5 flex-wrap">
        <span className="text-xs" style={{ color: t.textMuted }}>In <span className="font-semibold" style={{ color: t.textSecondary }}>{currency(totalIn)}</span></span>
        <span className="text-xs" style={{ color: t.textMuted }}>Fixed <span className="font-semibold" style={{ color: t.textSecondary }}>−{currency(fixedTotal)}</span></span>
        <span className="text-xs" style={{ color: t.textMuted }}>Var budget <span className="font-semibold" style={{ color: t.textSecondary }}>−{currency(varBudget)}</span></span>
        {miscThisMonth > 0 && <span className="text-xs" style={{ color: t.textMuted }}>Misc <span className="font-semibold" style={{ color: t.textSecondary }}>−{currency(miscThisMonth)}</span></span>}
      </div>
    </div>
  )
}

export default function JointPage() {
  const [tab, setTab] = useState('Overview')
  const { derived, loading } = useDashboard()

  return (
    <div className="space-y-3">
      <div className="pt-2 pb-1">
        <p className="text-xl font-bold" style={{ color: t.textPrimary }}>Joint finances</p>
        <p className="text-sm mt-0.5" style={{ color: t.textMuted }}>{monthLabel()}</p>
      </div>

      <TabBar active={tab} onChange={setTab} />

      {tab === 'Overview' && (
        <div className="space-y-3">
          {!loading && <JointRemaining derived={derived} />}
          <JointFixed />
          <JointVariable />
          <JointMisc />
          <JointSavings />
        </div>
      )}

      {tab === 'Reports' && <JointReports />}
    </div>
  )
}
