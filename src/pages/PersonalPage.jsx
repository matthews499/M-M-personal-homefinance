import { useState, useEffect, Component } from 'react'
import { useAuth } from '../lib/AuthContext'
import { t, cardStyle, inputStyle } from '../utils/theme'

// ── Error boundary — catches render errors instead of blanking ───

class PersonalErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  componentDidCatch(error, info) {
    console.error('[PersonalPage] render error:', error, info)
  }
  render() {
    if (this.state.error) {
      return (
        <div className="rounded-2xl p-5 space-y-3" style={{ backgroundColor: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)' }}>
          <p className="text-sm font-bold" style={{ color: '#f43f5e' }}>Something went wrong on this page</p>
          <p className="text-xs font-mono break-all" style={{ color: '#f87171' }}>{this.state.error.message}</p>
          <button
            onClick={() => this.setState({ error: null })}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold"
            style={{ backgroundColor: 'rgba(244,63,94,0.15)', color: '#f43f5e' }}
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
import { getCurrentPeriod, getPrevPeriod, getNextPeriod, getPeriodLabel, getPeriodShortRange } from '../utils/payCycle'
import { ensureSnapshot } from '../utils/snapshotGuard'
import { useTransfers } from '../hooks/useTransfers'
import { currency } from '../utils/format'
import PersonalRemaining from '../components/personal/PersonalRemaining'
import PersonalSummary   from '../components/personal/PersonalSummary'
import PersonalFixed     from '../components/personal/PersonalFixed'
import PersonalVariable  from '../components/personal/PersonalVariable'
import PersonalMisc      from '../components/personal/PersonalMisc'
import PersonalSavings   from '../components/personal/PersonalSavings'
import PersonalReports   from '../components/personal/PersonalReports'
import PersonalNotebook  from '../components/personal/PersonalNotebook'

const MATTHEW_ID = 'c722d728-5abe-41fe-9965-3f5d5c69a891'
const MADDY_ID   = '45b7ef92-2b47-47a8-ae2b-f7348271b62c'

function SendTransferModal({ myId, onSave, onCancel }) {
  const otherId   = myId === MATTHEW_ID ? MADDY_ID : MATTHEW_ID
  const otherName = myId === MATTHEW_ID ? 'Maddy' : 'Matthew'
  const [amount, setAmount]  = useState('')
  const [note,   setNote]    = useState('')
  const [date,   setDate]    = useState(new Date().toISOString().slice(0, 10))
  const [err,    setErr]     = useState(null)
  const [saving, setSaving]  = useState(false)

  async function handleSend() {
    if (!amount || parseFloat(amount) <= 0) { setErr('Enter a valid amount.'); return }
    setSaving(true)
    try {
      await onSave({ recipientId: otherId, amount: parseFloat(amount), period: getCurrentPeriod(), transfer_date: date, note })
    } catch (e) {
      setErr(e.message); setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }} onClick={onCancel}>
      <div className="w-full md:max-w-sm rounded-t-3xl md:rounded-2xl p-6 pb-10 md:pb-6 space-y-4" style={{ backgroundColor: t.card, border: `1px solid ${t.cardBorder}` }} onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full mx-auto mb-2 md:hidden" style={{ backgroundColor: 'rgba(128,128,128,0.3)' }} />
        <h2 className="text-base font-bold" style={{ color: t.textPrimary }}>Send to {otherName}</h2>
        <div>
          <p className="text-xs font-medium mb-1.5" style={{ color: t.textMuted }}>Amount (£)</p>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" autoFocus className="w-full px-3 py-3 rounded-xl text-base outline-none focus:ring-1 focus:ring-violet-500" style={inputStyle} />
        </div>
        <div>
          <p className="text-xs font-medium mb-1.5" style={{ color: t.textMuted }}>Date</p>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-3 rounded-xl text-base outline-none focus:ring-1 focus:ring-violet-500" style={inputStyle} />
        </div>
        <div>
          <p className="text-xs font-medium mb-1.5" style={{ color: t.textMuted }}>Note (optional)</p>
          <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. cinema tickets" className="w-full px-3 py-3 rounded-xl text-base outline-none focus:ring-1 focus:ring-violet-500" style={inputStyle} />
        </div>
        {err && <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: t.redDim, color: t.red }}>{err}</p>}
        <div className="flex gap-2 pt-1">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl text-sm font-medium" style={{ backgroundColor: 'var(--color-pill-bg)', color: t.textSecondary }}>Cancel</button>
          <button onClick={handleSend} disabled={saving} className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-50" style={{ backgroundColor: t.purple, color: '#fff' }}>
            {saving ? 'Sending…' : `Send to ${otherName}`}
          </button>
        </div>
      </div>
    </div>
  )
}

function PersonalTransfers({ period, userId }) {
  const { transfersForPeriod, sendTransfer, removeTransfer } = useTransfers()
  const [showSend, setShowSend] = useState(false)

  const periodTransfers = transfersForPeriod(period)

  async function handleSend(fields) {
    await sendTransfer(fields)
    setShowSend(false)
  }

  return (
    <>
      <div className="rounded-2xl p-5 space-y-4" style={cardStyle}>
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: t.textMuted }}>Transfers</p>
          <button onClick={() => setShowSend(true)} className="text-xs px-3 py-1.5 rounded-lg font-semibold" style={{ backgroundColor: t.purpleBg, color: t.purpleText }}>
            + Send
          </button>
        </div>

        {periodTransfers.length === 0 ? (
          <p className="text-sm" style={{ color: t.textMuted }}>No transfers this period.</p>
        ) : (
          <div className="space-y-0">
            {periodTransfers.map(tr => {
              const isSender = tr.sender_id === userId
              return (
                <div key={tr.id} className="flex items-center justify-between py-3" style={{ borderBottom: `1px solid ${t.divider}` }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm" style={{ color: t.textPrimary }}>
                      {isSender ? `To ${tr.recipient?.name ?? 'other'}` : `From ${tr.sender?.name ?? 'other'}`}
                    </p>
                    {tr.note && <p className="text-xs truncate mt-0.5" style={{ color: t.textMuted }}>{tr.note}</p>}
                    <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>{tr.transfer_date}</p>
                  </div>
                  <span className="text-sm font-bold tabular-nums mx-3" style={{ color: isSender ? t.red : t.green }}>
                    {isSender ? '−' : '+'}{currency(tr.amount)}
                  </span>
                  {isSender && (
                    <button onClick={() => { if (confirm('Delete this transfer?')) removeTransfer(tr.id) }} className="p-2 rounded-lg" style={{ color: t.textMuted }}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showSend && <SendTransferModal myId={userId} onSave={handleSend} onCancel={() => setShowSend(false)} />}
    </>
  )
}

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
        <PersonalErrorBoundary>
          <div className="space-y-3">
            <PersonalRemaining period={period} />
            <PersonalSummary />
            <PersonalFixed period={period} />
            <PersonalVariable period={period} />
            <PersonalMisc period={period} />
            <PersonalTransfers period={period} userId={userId} />
            <PersonalSavings />
          </div>
        </PersonalErrorBoundary>
      )}

      {tab === 'Reports'  && <PersonalReports period={period} />}
      {tab === 'Notebook' && <PersonalNotebook />}
    </div>
  )
}
