import { useState } from 'react'
import { t } from '../utils/theme'
import PersonalRemaining from '../components/personal/PersonalRemaining'
import PersonalSummary   from '../components/personal/PersonalSummary'
import PersonalFixed     from '../components/personal/PersonalFixed'
import PersonalVariable  from '../components/personal/PersonalVariable'
import PersonalMisc      from '../components/personal/PersonalMisc'
import PersonalSavings   from '../components/personal/PersonalSavings'
import PersonalReports   from '../components/personal/PersonalReports'

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

export default function PersonalPage() {
  const [tab, setTab] = useState('Overview')

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

      {tab === 'Overview' && (
        <div className="space-y-3">
          <PersonalRemaining />
          <PersonalSummary />
          <PersonalFixed />
          <PersonalVariable />
          <PersonalMisc />
          <PersonalSavings />
        </div>
      )}

      {tab === 'Reports' && <PersonalReports />}
    </div>
  )
}
