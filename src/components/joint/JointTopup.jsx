import { useState } from 'react'
import { useJointTopups } from '../../hooks/useJointTopups'
import { currency } from '../../utils/format'
import { sumAmount } from '../../utils/calculations'
import { t, cardStyle, inputStyle } from '../../utils/theme'
import { getCurrentPeriod, getPeriodDateRange } from '../../utils/payCycle'

function SectionLabel({ children }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: t.textMuted }}>
      {children}
    </p>
  )
}

function FieldLabel({ children }) {
  return <p className="text-xs font-medium mb-1.5" style={{ color: t.textMuted }}>{children}</p>
}

function TopupModal({ onSave, onCancel }) {
  const today = new Date().toISOString().slice(0, 10)
  const [amount,       setAmount]       = useState('')
  const [date,         setDate]         = useState(today)
  const [note,         setNote]         = useState('')
  const [customSplit,  setCustomSplit]  = useState(false)
  const [matthewPct,   setMatthewPct]   = useState(50)
  const [saving,       setSaving]       = useState(false)
  const [err,          setErr]          = useState(null)

  const maddyPct = 100 - matthewPct

  async function handleSave() {
    if (!amount || parseFloat(amount) <= 0) { setErr('Enter a positive amount.'); return }
    if (!date) { setErr('Date is required.'); return }
    setSaving(true)
    setErr(null)
    try {
      await onSave({
        amount:             parseFloat(amount),
        expense_date:       date,
        note:               note.trim(),
        custom_split_ratio: customSplit ? matthewPct / 100 : null,
      })
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
      onClick={onCancel}
    >
      <div
        className="w-full md:max-w-sm rounded-t-3xl md:rounded-2xl p-6 pb-10 md:pb-6 space-y-4"
        style={{ backgroundColor: t.card, border: `1px solid ${t.cardBorder}` }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-2 md:hidden" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
        <div>
          <h2 className="text-base font-bold" style={{ color: t.textPrimary }}>Top up joint pot</h2>
          <p className="text-xs mt-1" style={{ color: t.textMuted }}>
            Increases available budget. Each person's share reduces their personal disposable.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Amount (£)</FieldLabel>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              autoFocus
              className="w-full px-3 py-3 rounded-xl text-base outline-none focus:ring-1 focus:ring-violet-500"
              style={inputStyle}
            />
          </div>
          <div>
            <FieldLabel>Date</FieldLabel>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-3 rounded-xl text-base outline-none focus:ring-1 focus:ring-violet-500"
              style={inputStyle}
            />
          </div>
        </div>

        <div>
          <FieldLabel>Note (optional)</FieldLabel>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="e.g. Extra buffer for the month"
            className="w-full px-3 py-3 rounded-xl text-base outline-none focus:ring-1 focus:ring-violet-500"
            style={inputStyle}
          />
        </div>

        {/* Custom split toggle */}
        <div
          className="flex items-center justify-between px-3 py-3 rounded-xl cursor-pointer"
          style={{ backgroundColor: customSplit ? t.violetBg : 'rgba(255,255,255,0.04)', border: `1px solid ${customSplit ? t.violet : t.cardBorder}` }}
          onClick={() => setCustomSplit(s => !s)}
        >
          <span className="text-sm font-medium" style={{ color: customSplit ? t.violet : t.textSecondary }}>
            Custom split
          </span>
          <div
            className="w-10 h-5 rounded-full transition-colors flex items-center"
            style={{ backgroundColor: customSplit ? t.violet : 'rgba(128,128,128,0.3)', justifyContent: customSplit ? 'flex-end' : 'flex-start', padding: '2px' }}
          >
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#fff' }} />
          </div>
        </div>

        {customSplit && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span style={{ color: t.textSecondary }}>Matthew</span>
              <span className="font-bold tabular-nums" style={{ color: t.textPrimary }}>{matthewPct}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={matthewPct}
              onChange={e => setMatthewPct(Number(e.target.value))}
              className="w-full accent-violet-500"
            />
            <div className="flex justify-between text-xs">
              <span style={{ color: t.textSecondary }}>Maddy</span>
              <span className="font-bold tabular-nums" style={{ color: t.textPrimary }}>{maddyPct}%</span>
            </div>
          </div>
        )}

        {err && (
          <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: t.redDim, color: t.red }}>
            {err}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl text-sm font-medium"
            style={{ backgroundColor: 'rgba(255,255,255,0.07)', color: t.textSecondary }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
            style={{ backgroundColor: t.purple, color: '#fff' }}
          >
            {saving ? 'Saving…' : 'Add top-up'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function JointTopup({ period }) {
  const activePeriod = period ?? getCurrentPeriod()
  const { start, end } = getPeriodDateRange(activePeriod)
  const { items, loading, create, remove } = useJointTopups()
  const [adding, setAdding] = useState(false)

  const periodItems = items.filter(i => i.expense_date >= start && i.expense_date <= end)
  const total       = sumAmount(periodItems)

  async function handleCreate(fields) {
    await create({ ...fields, period: activePeriod })
    setAdding(false)
  }

  async function handleDelete(id) {
    if (confirm('Remove this top-up?')) await remove(id)
  }

  if (loading) {
    return (
      <div className="rounded-2xl p-5" style={cardStyle}>
        <p className="text-xs" style={{ color: t.textMuted }}>Loading…</p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-2xl p-5 space-y-4" style={cardStyle}>
        <div className="flex items-center justify-between">
          <SectionLabel>Joint pot top-ups</SectionLabel>
          <button
            onClick={() => setAdding(true)}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold"
            style={{ backgroundColor: t.violetBg, color: t.violet }}
          >
            + Top up
          </button>
        </div>

        {periodItems.length === 0 ? (
          <p className="text-sm py-1" style={{ color: t.textMuted }}>No top-ups this period.</p>
        ) : (
          <div className="space-y-0">
            {periodItems.map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between py-3.5"
                style={{ borderBottom: `1px solid ${t.divider}` }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: t.textPrimary }}>
                    {item.note || 'Joint pot top-up'}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>{item.expense_date}</p>
                </div>
                <span
                  className="text-base font-bold tabular-nums mx-3"
                  style={{ color: t.green }}
                >
                  +{currency(item.amount)}
                </span>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-2 rounded-lg active:bg-white/10"
                  style={{ color: t.textMuted }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {periodItems.length > 0 && (
          <div className="flex justify-between items-center pt-1">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: t.textMuted }}>
              Total this period
            </span>
            <span className="text-xl font-bold tabular-nums" style={{ color: t.green }}>
              +{currency(total)}
            </span>
          </div>
        )}
      </div>

      {adding && <TopupModal onSave={handleCreate} onCancel={() => setAdding(false)} />}
    </>
  )
}
