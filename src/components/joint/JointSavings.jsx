import { useState } from 'react'
import { useJointSavings } from '../../hooks/useJointSavings'
import { currency } from '../../utils/format'
import { monthParam } from '../../utils/dates'
import { calcSavingsMonthlyRequired, calcSavingsDeposited } from '../../utils/calculations'
import { t, cardStyle, surfaceStyle, inputStyle } from '../../utils/theme'

function SectionLabel({ children }) {
  return <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: t.textMuted }}>{children}</p>
}

function FieldLabel({ children }) {
  return <p className="text-xs font-medium mb-1.5" style={{ color: t.textMuted }}>{children}</p>
}

function ProgressBar({ pct }) {
  const capped = Math.min(pct, 100)
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${capped}%`, backgroundColor: t.violet }} />
    </div>
  )
}

// Sheet-style modal wrapper
function Sheet({ onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }} onClick={onClose}>
      <div className="w-full md:max-w-sm rounded-t-3xl md:rounded-2xl p-6 pb-10 md:pb-6 space-y-4" style={{ backgroundColor: t.card, border: `1px solid ${t.cardBorder}` }} onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full mx-auto mb-2 md:hidden" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
        {children}
      </div>
    </div>
  )
}

// ── New pot modal ──────────────────────────────────────────────

function NewPotModal({ onSave, onClose }) {
  const [name,       setName]       = useState('')
  const [target,     setTarget]     = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [saving,     setSaving]     = useState(false)
  const [err,        setErr]        = useState(null)

  async function handleSave() {
    if (!name.trim() || !target || !targetDate) { setErr('All fields are required.'); return }
    setSaving(true)
    try {
      await onSave({ name: name.trim(), target_amount: parseFloat(target), target_date: targetDate })
      onClose()
    } catch (e) {
      setErr(e.message)
      setSaving(false)
    }
  }

  return (
    <Sheet onClose={onClose}>
      <h2 className="text-base font-bold" style={{ color: t.textPrimary }}>New savings pot</h2>
      <div>
        <FieldLabel>Name</FieldLabel>
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Holiday" autoFocus className="w-full px-3 py-3 rounded-xl text-base outline-none focus:ring-1 focus:ring-violet-500" style={inputStyle} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Target amount (£)</FieldLabel>
          <input type="number" value={target} onChange={e => setTarget(e.target.value)} placeholder="0.00" className="w-full px-3 py-3 rounded-xl text-base outline-none focus:ring-1 focus:ring-violet-500" style={inputStyle} />
        </div>
        <div>
          <FieldLabel>Target date</FieldLabel>
          <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="w-full px-3 py-3 rounded-xl text-base outline-none focus:ring-1 focus:ring-violet-500" style={inputStyle} />
        </div>
      </div>
      <p className="text-xs" style={{ color: t.textMuted }}>
        A fixed outgoing entry will be created automatically with the calculated monthly contribution.
      </p>
      {err && <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: t.redDim, color: t.red }}>{err}</p>}
      <div className="flex gap-2 pt-1">
        <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-medium" style={{ backgroundColor: 'rgba(255,255,255,0.07)', color: t.textSecondary }}>Cancel</button>
        <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-50" style={{ backgroundColor: t.purple, color: '#fff' }}>
          {saving ? 'Creating…' : 'Create pot'}
        </button>
      </div>
    </Sheet>
  )
}

// ── Edit pot modal ─────────────────────────────────────────────

function EditPotModal({ pot, onSave, onClose }) {
  const [target,     setTarget]     = useState(pot.target_amount)
  const [targetDate, setTargetDate] = useState(pot.target_date)
  const [saving,     setSaving]     = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave(pot.id, { target_amount: parseFloat(target), target_date: targetDate })
    onClose()
  }

  return (
    <Sheet onClose={onClose}>
      <div>
        <h2 className="text-base font-bold" style={{ color: t.textPrimary }}>Edit — {pot.name}</h2>
        <p className="text-xs mt-1" style={{ color: t.textMuted }}>The linked fixed outgoing updates automatically.</p>
      </div>
      <div>
        <FieldLabel>Target amount (£)</FieldLabel>
        <input type="number" value={target} onChange={e => setTarget(e.target.value)} className="w-full px-3 py-3 rounded-xl text-base outline-none focus:ring-1 focus:ring-violet-500" style={inputStyle} />
      </div>
      <div>
        <FieldLabel>Target date</FieldLabel>
        <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="w-full px-3 py-3 rounded-xl text-base outline-none focus:ring-1 focus:ring-violet-500" style={inputStyle} />
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-medium" style={{ backgroundColor: 'rgba(255,255,255,0.07)', color: t.textSecondary }}>Cancel</button>
        <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-50" style={{ backgroundColor: t.purple, color: '#fff' }}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </Sheet>
  )
}

// ── Log deposit modal ──────────────────────────────────────────

function DepositModal({ pot, onSave, onClose }) {
  const [amount, setAmount] = useState('')
  const [month,  setMonth]  = useState(monthParam().slice(0, 7))
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!amount) return
    setSaving(true)
    await onSave(pot.id, parseFloat(amount), month + '-01')
    onClose()
  }

  return (
    <Sheet onClose={onClose}>
      <div>
        <h2 className="text-base font-bold" style={{ color: t.textPrimary }}>Log deposit</h2>
        <p className="text-xs mt-1" style={{ color: t.textMuted }}>{pot.name}</p>
      </div>
      <div>
        <FieldLabel>Amount deposited (£)</FieldLabel>
        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" autoFocus className="w-full px-3 py-3 rounded-xl text-base outline-none focus:ring-1 focus:ring-violet-500" style={inputStyle} />
      </div>
      <div>
        <FieldLabel>Month</FieldLabel>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-full px-3 py-3 rounded-xl text-base outline-none focus:ring-1 focus:ring-violet-500" style={inputStyle} />
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-medium" style={{ backgroundColor: 'rgba(255,255,255,0.07)', color: t.textSecondary }}>Cancel</button>
        <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-50" style={{ backgroundColor: t.purple, color: '#fff' }}>{saving ? 'Saving…' : 'Log deposit'}</button>
      </div>
    </Sheet>
  )
}

// ── Main component ─────────────────────────────────────────────

export default function JointSavings() {
  const { pots, deposits, depositsForPot, loading, createPot, updatePot, removePot, addDeposit } = useJointSavings()
  const [adding,     setAdding]     = useState(false)
  const [editPot,    setEditPot]    = useState(null)
  const [depositPot, setDepositPot] = useState(null)

  async function handleDelete(id) {
    if (confirm('Delete this savings pot? The linked fixed outgoing will also be removed.')) await removePot(id)
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
      <div className="rounded-2xl p-5 space-y-5" style={cardStyle}>
        <div className="flex items-center justify-between">
          <SectionLabel>Joint savings pots</SectionLabel>
          <button
            onClick={() => setAdding(true)}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold"
            style={{ backgroundColor: t.purpleBg, color: t.purpleText }}
          >
            + New pot
          </button>
        </div>

        {pots.length === 0 && !adding && (
          <p className="text-sm py-1" style={{ color: t.textMuted }}>No savings pots yet.</p>
        )}

        <div className="space-y-3">
          {pots.map(pot => {
            const potDeposits = depositsForPot(pot.id)
            const deposited   = calcSavingsDeposited(potDeposits)
            const target      = Number(pot.target_amount)
            const monthly     = calcSavingsMonthlyRequired(pot, potDeposits)
            const pct         = target > 0 ? Math.min((deposited / target) * 100, 100) : 0
            const done        = deposited >= target

            return (
              <div key={pot.id} className="rounded-xl p-4 space-y-3" style={surfaceStyle}>
                {/* Title row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold" style={{ color: t.textPrimary }}>{pot.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>Target: {pot.target_date}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {done ? (
                      <span className="text-xs px-2 py-0.5 rounded-md font-semibold" style={{ backgroundColor: t.greenDim, color: t.green }}>Complete</span>
                    ) : (
                      <div className="text-right mr-1">
                        <p className="text-sm font-bold tabular-nums" style={{ color: t.violet }}>{currency(monthly)}</p>
                        <p className="text-xs" style={{ color: t.textMuted }}>per month</p>
                      </div>
                    )}
                    <button onClick={() => setEditPot(pot)} className="p-2 rounded-lg active:bg-white/10" style={{ color: t.textMuted }}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-3 1 1-3a4 4 0 01.828-1.414z" /></svg>
                    </button>
                    <button onClick={() => handleDelete(pot.id)} className="p-2 rounded-lg active:bg-white/10" style={{ color: t.textMuted }}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>

                {/* Progress */}
                <ProgressBar pct={pct} />
                <div className="flex justify-between text-xs">
                  <span style={{ color: t.violet }}>{currency(deposited)} saved</span>
                  <span style={{ color: t.textMuted }}>of {currency(target)}</span>
                </div>

                {/* Log deposit */}
                <button
                  onClick={() => setDepositPot(pot)}
                  className="w-full py-2.5 rounded-lg text-xs font-semibold transition-colors active:brightness-90"
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: t.textSecondary, border: `1px solid ${t.divider}` }}
                >
                  Log deposit
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {adding     && <NewPotModal  onSave={createPot} onClose={() => setAdding(false)} />}
      {editPot    && <EditPotModal pot={editPot}    onSave={updatePot}  onClose={() => setEditPot(null)} />}
      {depositPot && <DepositModal pot={depositPot} onSave={addDeposit} onClose={() => setDepositPot(null)} />}
    </>
  )
}
