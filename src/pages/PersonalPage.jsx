import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { t } from '../utils/theme'
import { getCurrentPeriod, getPrevPeriod, getNextPeriod, getPeriodLabel, getPeriodShortRange } from '../utils/payCycle'
import { ensureSnapshot } from '../utils/snapshotGuard'
import PersonalRemaining from '../components/personal/PersonalRemaining'
import PersonalSummary   from '../components/personal/PersonalSummary'
import PersonalFixed     from '../components/personal/PersonalFixed'
import PersonalVariable  from '../components/personal/PersonalVariable'
import PersonalMisc      from '../components/personal/PersonalMisc'
import PersonalSavings   from '../components/personal/PersonalSavings'
import PersonalReports   from '../components/personal/PersonalReports'
import PersonalNotebook  from '../components/personal/PersonalNotebook'

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

export default function PersonalPage() {
  const [tab,    setTab]    = useState('Overview')
  const [period, setPeriod] = useState(getCurrentPeriod)
  const { session } = useAuth()
  const userId = session?.user?.id

  // Feature 2: auto-snapshot on first activity in new period
  useEffect(() => {
    if (userId) ensureSnapshot(userId)
  }, [userId])

  return (
    <div className="space-y-3">
      <div className="pt-2 pb-1 flex items-center justify-between">
        <div>
          <p className="text-xl font-bold" style={{ color: t.textPrimary }}>Personal finances</p>
          <p className="text-sm mt-0.5" style={{ color: t.textMuted }}>Only visible to you</p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-lg font-semibold" style={{ backgroundColor: t.greenDim, color: t.green }}>
          Private
        </span>
      </div>

      <TabBar active={tab} onChange={setTab} />

      {(tab === 'Overview' || tab === 'Reports') && (
        <PeriodNav period={period} onChange={setPeriod} />
      )}

      {tab === 'Overview' && (
        <div className="space-y-3">
          <PersonalRemaining period={period} />
          <PersonalSummary />
          <PersonalFixed period={period} />
          <PersonalVariable period={period} />
          <PersonalMisc period={period} />
          <PersonalSavings />
        </div>
      )}

      {tab === 'Reports'  && <PersonalReports period={period} />}
      {tab === 'Notebook' && <PersonalNotebook />}
    </div>
  )
}
