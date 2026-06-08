import { useState } from 'react'
import { usePersonalFixed } from '../../hooks/usePersonalFixed'
import { currency } from '../../utils/format'
import { ordinal } from '../../utils/dates'
import { sumAmount } from '../../utils/calculations'
import { t, cardStyle, inputStyle } from '../../utils/theme'
import { getCurrentPeriod, addPeriodsToString, getPeriodLabel } from '../../utils/payCycle'

function SectionLabel({ children }) {
  return <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: t.textMuted }}>{children}</p>
}

function FieldLabel({ children }) {
  return <p className="text-xs font-medium mb-1.5" style={{ color: t.textMuted }}>{children}</p>
}

function Toggle({ on, onChange, label, hint }) {
  return (
    <div className="flex items-center justify-between py-1">
      <div>
        <p className="text-sm font-medium" style={{ color: t.textPrimary }}>{label}</p>
        {hint && <p className="text-xs" style={{ color: t.textMuted }}>{hint}</p>}
      </div>
      <button
        onClick={() => onChange(!on)}
        className="relative w-10 h-6 rounded-full transition-colors shrink-0"
        style={{ backgroundColor: on ? t.purple : 'rgba(128,128,128,0.3)' }}
      >
        <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform" style={{ left: on ? '18px' : '2px' }} />
      </button>
    </div>
  )
}

function FixedModal({ item, onSave, onCancel }) {
  const [name,       setName]       = useState(item?.name ?? '')
  const [amount,     setAmount]     = useState(item?.amount ?? '')
  const [day,        setDay]        = useState(item?.day_of_month ?? '')
  const [isTemp,     setIsTemp]     = useState(item?.active_until != null)
  const [months,     setMonths]     = useState('')
  const [isFuture,   setIsFuture]   = useState(item?.active_from != null && item.active_from > getCurrentPeriod())
  const [fromPeriod, setFromPeriod] = useState(item?.active_from ?? '')
  const [err,        setErr]        = useState(null)
  const [saving,     setSaving]     = useState(false)

  const existingUntil = item?.active_until

  async function handleSave() {
    if (!name.trim() || !amount || !day) { setErr('All fields required.'); return }
    if (isTemp && (!months || parseInt(months, 10) < 1)) { setErr('Enter number of months (minimum 1).'); return }
    if (isFuture && !fromPeriod.match(/^\d{4}-\d{2}$/)) { setErr('Enter start period as YYYY-MM.'); return }

    let active_until = null
    if (isTemp) active_until = addPeriodsToString(getCurrentPeriod(), parseInt(months, 10))

    let active_from = null
    if (isFuture && fromPeriod) active_from = fromPeriod

    setSaving(true)
    try {
      await onSave({ name: name.trim(), amount: parseFloat(amount), day_of_month: parseInt(day, 10), active_until, active_from })
    } catch (e) {
      setErr(e.message)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }} onClick={onCancel}>
      <div className="w-full md:max-w-sm rounded-t-3xl md:rounded-2xl p-6 pb-10 md:pb-6 space-y-4" style={{ backgroundColor: t.card, border: `1px solid ${t.cardBorder}`, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full mx-auto mb-2 md:hidden" style={{ backgroundColor: 'rgba(128,128,128,0.3)' }} />
        <h2 className="text-base font-bold" style={{ color: t.textPrimary }}>{item ? 'Edit fixed cost' : 'Add fixed cost'}</h2>
        <div>
          <FieldLabel>Name</FieldLabel>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Phone" autoFocus className="w-full px-3 py-3 rounded-xl text-base outline-none focus:ring-1 focus:ring-violet-500" style={inputStyle} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Amount (£)</FieldLabel>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full px-3 py-3 rounded-xl text-base outline-none focus:ring-1 focus:ring-violet-500" style={inputStyle} />
          </div>
          <div>
            <FieldLabel>Day of month</FieldLabel>
            <input type="number" value={day} onChange={e => setDay(e.target.value)} placeholder="1" min={1} max={31} className="w-full px-3 py-3 rounded-xl text-base outline-none focus:ring-1 focus:ring-violet-500" style={inputStyle} />
          </div>
        </div>

        <Toggle on={isFuture} onChange={setIsFuture} label="Start in a future period" hint="Cost is visible as upcoming but won't deduct until that period" />
        {isFuture && (
          <div>
            <FieldLabel>Start period (YYYY-MM)</FieldLabel>
            <input type="text" value={fromPeriod} onChange={e => setFromPeriod(e.target.value)} placeholder={`e.g. ${getCurrentPeriod()}`} className="w-full px-3 py-3 rounded-xl text-base outline-none focus:ring-1 focus:ring-violet-500" style={inputStyle} />
            {fromPeriod.match(/^\d{4}-\d{2}$/) && (
              <p className="text-xs mt-1.5" style={{ color: t.amber }}>Starts {getPeriodLabel(fromPeriod)}</p>
            )}
          </div>
        )}

        <Toggle on={isTemp} onChange={setIsTemp} label="Temporary cost" hint="Expires after a set number of months" />
        {isTemp && (
          <div>
            <FieldLabel>Number of months</FieldLabel>
            <input type="number" value={months} onChange={e => setMonths(e.target.value)} placeholder="e.g. 3" min={1} className="w-full px-3 py-3 rounded-xl text-base outline-none focus:ring-1 focus:ring-violet-500" style={inputStyle} />
            {months && parseInt(months, 10) > 0 && (
              <p className="text-xs mt-1.5" style={{ color: t.violet }}>
                Active until {getPeriodLabel(addPeriodsToString(getCurrentPeriod(), parseInt(months, 10)))}
              </p>
            )}
          </div>
        )}
        {existingUntil && !isTemp && (
          <p className="text-xs" style={{ color: t.textMuted }}>Was set to expire {getPeriodLabel(existingUntil)} — now permanent</p>
        )}

        {err && <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: t.redDim, color: t.red }}>{err}</p>}
        <div className="flex gap-2 pt-1">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl text-sm font-medium" style={{ backgroundColor: 'var(--color-pill-bg)', color: t.textSecondary }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-50" style={{ backgroundColor: t.purple, color: '#fff' }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ItemRow({ item, onEdit, onDelete }) {
  return (
    <div className="flex items-center justify-between py-3.5" style={{ borderBottom: `1px solid ${t.divider}` }}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: t.textPrimary }}>{item.name}</p>
        <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>
          {ordinal(item.day_of_month)} of the month
          {item.active_until && <span style={{ color: t.amber }}> · until {getPeriodLabel(item.active_until)}</span>}
        </p>
      </div>
      <span className="text-base font-bold tabular-nums mx-3" style={{ color: t.textPrimary }}>{currency(item.amount)}</span>
      <div className="flex gap-1">
        <button onClick={() => onEdit(item)} className="p-2 rounded-lg active:bg-white/10" style={{ color: t.textMuted }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-3 1 1-3a4 4 0 01.828-1.414z" /></svg>
        </button>
        <button onClick={() => onDelete(item.id)} className="p-2 rounded-lg active:bg-white/10" style={{ color: t.textMuted }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </div>
    </div>
  )
}

export default function PersonalFixed({ period }) {
  const currentPeriod = period ?? getCurrentPeriod()
  const { items, loading, create, update, remove } = usePersonalFixed()
  const [adding,      setAdding]      = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  // Not yet expired
  const notExpired     = items.filter(i => !i.active_until || i.active_until >= currentPeriod)
  // Upcoming: active_from in a future period
  const upcomingItems  = notExpired.filter(i => i.active_from && i.active_from > currentPeriod)
  // Active: no active_from, or active_from <= current
  const activeItems    = notExpired.filter(i => !i.active_from || i.active_from <= currentPeriod)

  async function handleCreate(fields) { await create(fields); setAdding(false) }
  async function handleUpdate(fields) { await update(editingItem.id, fields); setEditingItem(null) }
  async function handleDelete(id) { if (confirm('Delete this fixed cost?')) await remove(id) }

  if (loading) {
    return (
      <div className="rounded-2xl p-5" style={cardStyle}>
        <p className="text-xs" style={{ color: t.textMuted }}>Loading…</p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-2xl p-5 space-y-5" style={cardStyle}>
        <div className="flex items-center justify-between">
          <SectionLabel>Personal fixed costs</SectionLabel>
          <button onClick={() => setAdding(true)} className="text-xs px-3 py-1.5 rounded-lg font-semibold" style={{ backgroundColor: t.purpleBg, color: t.purpleText }}>
            + Add
          </button>
        </div>

        {activeItems.length === 0 && (
          <p className="text-sm py-1" style={{ color: t.textMuted }}>No personal fixed costs yet.</p>
        )}

        <div className="space-y-0">
          {activeItems.map(item => (
            <ItemRow key={item.id} item={item} onEdit={setEditingItem} onDelete={handleDelete} />
          ))}
        </div>

        {activeItems.length > 0 && (
          <div className="flex justify-between items-center pt-1">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: t.textMuted }}>Total</span>
            <span className="text-xl font-bold tabular-nums" style={{ color: t.textPrimary }}>{currency(sumAmount(activeItems))}</span>
          </div>
        )}

        {/* Upcoming costs */}
        {upcomingItems.length > 0 && (
          <div className="pt-2 border-t" style={{ borderColor: t.divider }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: t.amber }}>Upcoming</p>
            <div className="space-y-0">
              {upcomingItems.map(item => (
                <div key={item.id} className="flex items-center justify-between py-3" style={{ borderBottom: `1px solid ${t.divider}` }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: t.textSecondary }}>{item.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: t.amber }}>
                      Starts {getPeriodLabel(item.active_from)}
                      {item.active_until && <span style={{ color: t.textMuted }}> · until {getPeriodLabel(item.active_until)}</span>}
                    </p>
                  </div>
                  <span className="text-sm font-bold tabular-nums mx-3" style={{ color: t.textSecondary }}>{currency(item.amount)}</span>
                  <div className="flex gap-1">
                    <button onClick={() => setEditingItem(item)} className="p-2 rounded-lg active:bg-white/10" style={{ color: t.textMuted }}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-3 1 1-3a4 4 0 01.828-1.414z" /></svg>
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="p-2 rounded-lg active:bg-white/10" style={{ color: t.textMuted }}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs mt-2" style={{ color: t.textMuted }}>Upcoming costs are not included in totals or calculations.</p>
          </div>
        )}
      </div>

      {adding      && <FixedModal onSave={handleCreate} onCancel={() => setAdding(false)} />}
      {editingItem && <FixedModal item={editingItem} onSave={handleUpdate} onCancel={() => setEditingItem(null)} />}
    </>
  )
}
