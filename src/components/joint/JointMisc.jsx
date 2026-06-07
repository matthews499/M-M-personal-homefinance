import { useState } from 'react'
import { useJointMisc } from '../../hooks/useJointMisc'
import { currency } from '../../utils/format'
import { monthParam } from '../../utils/dates'
import { sumAmount } from '../../utils/calculations'
import { t, cardStyle, inputStyle } from '../../utils/theme'

function SectionLabel({ children }) {
  return <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: t.textMuted }}>{children}</p>
}

function FieldLabel({ children }) {
  return <p className="text-xs font-medium mb-1.5" style={{ color: t.textMuted }}>{children}</p>
}

function MiscModal({ item, onSave, onCancel }) {
  const today = new Date().toISOString().slice(0, 10)
  const [name,   setName]   = useState(item?.name ?? '')
  const [amount, setAmount] = useState(item?.amount ?? '')
  const [date,   setDate]   = useState(item?.expense_date ?? today)
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState(null)

  async function handleSave() {
    if (!name.trim() || !amount || !date) { setErr('All fields required.'); return }
    setSaving(true)
    setErr(null)
    try {
      await onSave({ name: name.trim(), amount: parseFloat(amount), expense_date: date })
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }} onClick={onCancel}>
      <div className="w-full md:max-w-sm rounded-t-3xl md:rounded-2xl p-6 pb-10 md:pb-6 space-y-4" style={{ backgroundColor: t.card, border: `1px solid ${t.cardBorder}` }} onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full mx-auto mb-2 md:hidden" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
        <h2 className="text-base font-bold" style={{ color: t.textPrimary }}>{item ? 'Edit expense' : 'Add miscellaneous expense'}</h2>
        <div>
          <FieldLabel>Description</FieldLabel>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Car wash" autoFocus className="w-full px-3 py-3 rounded-xl text-base outline-none focus:ring-1 focus:ring-violet-500" style={inputStyle} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Amount (£)</FieldLabel>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full px-3 py-3 rounded-xl text-base outline-none focus:ring-1 focus:ring-violet-500" style={inputStyle} />
          </div>
          <div>
            <FieldLabel>Date</FieldLabel>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-3 rounded-xl text-base outline-none focus:ring-1 focus:ring-violet-500" style={inputStyle} />
          </div>
        </div>
        {err && <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: t.redDim, color: t.red }}>{err}</p>}
        <div className="flex gap-2 pt-1">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl text-sm font-medium" style={{ backgroundColor: 'rgba(255,255,255,0.07)', color: t.textSecondary }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-50" style={{ backgroundColor: t.purple, color: '#fff' }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function JointMisc() {
  const month = monthParam()
  const { items, loading, miscForMonth, create, update, remove } = useJointMisc()
  const [adding,      setAdding]      = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  const monthItems = miscForMonth(month)
  const total      = sumAmount(monthItems)

  async function handleCreate(fields) { await create(fields); setAdding(false) }
  async function handleUpdate(fields) { await update(editingItem.id, fields); setEditingItem(null) }
  async function handleDelete(id) {
    if (confirm('Delete this expense?')) await remove(id)
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
          <SectionLabel>Miscellaneous</SectionLabel>
          <button
            onClick={() => setAdding(true)}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold"
            style={{ backgroundColor: t.purpleBg, color: t.purpleText }}
          >
            + Add
          </button>
        </div>

        {monthItems.length === 0 && (
          <p className="text-sm py-1" style={{ color: t.textMuted }}>No miscellaneous expenses this month.</p>
        )}

        <div className="space-y-0">
          {monthItems.map(item => (
            <div key={item.id} className="flex items-center justify-between py-3.5" style={{ borderBottom: `1px solid ${t.divider}` }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: t.textPrimary }}>{item.name}</p>
                <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>{item.expense_date}</p>
              </div>
              <span className="text-base font-bold tabular-nums mx-3" style={{ color: t.textPrimary }}>{currency(item.amount)}</span>
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

        {monthItems.length > 0 && (
          <div className="flex justify-between items-center pt-1">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: t.textMuted }}>This month</span>
            <span className="text-xl font-bold tabular-nums" style={{ color: t.textPrimary }}>{currency(total)}</span>
          </div>
        )}
      </div>

      {adding     && <MiscModal onSave={handleCreate} onCancel={() => setAdding(false)} />}
      {editingItem && <MiscModal item={editingItem} onSave={handleUpdate} onCancel={() => setEditingItem(null)} />}
    </>
  )
}
