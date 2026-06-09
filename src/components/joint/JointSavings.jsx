import { useState } from 'react'
import { useJointSavings } from '../../hooks/useJointSavings'
import { currency } from '../../utils/format'
import { calcSavingsMonthlyRequired, calcSavingsBalance } from '../../utils/calculations'
import { t, cardStyle, surfaceStyle, inputStyle } from '../../utils/theme'
import { format, parseISO } from 'date-fns'

function SectionLabel({ children }) {
  return <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: t.textMuted }}>{children}</p>
}
function FieldLabel({ children }) {
  return <p className="text-xs font-medium mb-1.5" style={{ color: t.textMuted }}>{children}</p>
}
function ProgressBar({ pct }) {
  const capped = Math.min(pct, 100)
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(128,128,128,0.15)' }}>
      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${capped}%`, backgroundColor: t.violet }} />
    </div>
  )
}

function Sheet({ onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
      onClick={onClose}
    >
      <div
        className="w-full md:max-w-sm rounded-t-3xl md:rounded-2xl p-6 pb-10 md:pb-6 space-y-4"
        style={{ backgroundColor: t.card, border: `1px solid ${t.cardBorder}` }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-2 md:hidden" style={{ backgroundColor: 'rgba(128,128,128,0.3)' }} />
        {children}
      </div>
    </div>
  )
}

// ── Split picker (open-mode deposits + withdrawals) ──────────────
// Shows two £ fields that must sum to `total`. Editing either one
// auto-updates the other so they always balance.

function SplitPicker({ total, matthewShare, maddyShare, onChange }) {
  function handleMatthew(raw) {
    const m = parseFloat(raw) || 0
    const maddy = Math.max(0, parseFloat((total - m).toFixed(2)))
    onChange(parseFloat(m.toFixed(2)), maddy)
  }
  function handleMaddy(raw) {
    const md = parseFloat(raw) || 0
    const matthew = Math.max(0, parseFloat((total - md).toFixed(2)))
    onChange(matthew, parseFloat(md.toFixed(2)))
  }

  const sum = (matthewShare ?? 0) + (maddyShare ?? 0)
  const mismatch = Math.abs(sum - total) > 0.01

  return (
    <div className="space-y-2">
      <FieldLabel>Split between Matthew and Maddy</FieldLabel>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] mb-1" style={{ color: t.textMuted }}>Matthew (£)</p>
          <input
            type="number"
            value={matthewShare ?? ''}
            onChange={e => handleMatthew(e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none focus:ring-1 focus:ring-violet-500"
            style={inputStyle}
          />
        </div>
        <div>
          <p className="text-[10px] mb-1" style={{ color: t.textMuted }}>Maddy (£)</p>
          <input
            type="number"
            value={maddyShare ?? ''}
            onChange={e => handleMaddy(e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none focus:ring-1 focus:ring-violet-500"
            style={inputStyle}
          />
        </div>
      </div>
      {mismatch && total > 0 && (
        <p className="text-[10px] px-2 py-1 rounded" style={{ backgroundColor: t.redDim, color: t.red }}>
          Shares must add up to {currency(total)}
        </p>
      )}
    </div>
  )
}

// ── New pot modal ─────────────────────────────────────────────────

function NewPotModal({ onSave, onClose }) {
  const [mode,       setMode]       = useState('targeted')
  const [name,       setName]       = useState('')
  const [target,     setTarget]     = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [saving,     setSaving]     = useState(false)
  const [err,        setErr]        = useState(null)

  async function handleSave() {
    if (!name.trim()) { setErr('Name is required.'); return }
    if (mode === 'targeted' && (!target || !targetDate)) {
      setErr('Target amount and date are required for targeted mode.')
      return
    }
    setSaving(true)
    try {
      if (mode === 'targeted') {
        await onSave({ name: name.trim(), mode: 'targeted', target_amount: parseFloat(target), target_date: targetDate })
      } else {
        await onSave({ name: name.trim(), mode: 'open' })
      }
      onClose()
    } catch (e) { setErr(e.message); setSaving(false) }
  }

  return (
    <Sheet onClose={onClose}>
      <h2 className="text-base font-bold" style={{ color: t.textPrimary }}>New joint savings pot</h2>

      {/* Mode selector */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { value: 'targeted', label: 'With target',    desc: 'Goal amount & date, fixed monthly outgoing' },
          { value: 'open',     label: 'Without target', desc: 'Manual deposits, custom split per deposit'  },
        ].map(opt => (
          <button
            key={opt.value}
            onClick={() => setMode(opt.value)}
            className="rounded-xl p-3 text-left transition-all"
            style={{
              border: `1px solid ${mode === opt.value ? t.violet : t.cardBorder}`,
              backgroundColor: mode === opt.value ? t.violetBg : 'transparent',
            }}
          >
            <p className="text-xs font-semibold" style={{ color: mode === opt.value ? t.violet : t.textPrimary }}>{opt.label}</p>
            <p className="text-[10px] mt-0.5 leading-snug" style={{ color: t.textMuted }}>{opt.desc}</p>
          </button>
        ))}
      </div>

      <div>
        <FieldLabel>Name</FieldLabel>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={mode === 'targeted' ? 'e.g. Holiday fund' : 'e.g. General savings'}
          autoFocus
          className="w-full px-3 py-3 rounded-xl text-base outline-none focus:ring-1 focus:ring-violet-500"
          style={inputStyle}
        />
      </div>

      {mode === 'targeted' && (
        <>
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
          <p className="text-xs -mt-1" style={{ color: t.textMuted }}>A fixed joint outgoing will be created with the calculated monthly contribution.</p>
        </>
      )}

      {err && <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: t.redDim, color: t.red }}>{err}</p>}
      <div className="flex gap-2 pt-1">
        <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-medium" style={{ backgroundColor: 'var(--color-pill-bg)', color: t.textSecondary }}>Cancel</button>
        <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-50" style={{ backgroundColor: t.purple, color: '#fff' }}>
          {saving ? 'Creating…' : 'Create pot'}
        </button>
      </div>
    </Sheet>
  )
}

// ── Edit pot modal ────────────────────────────────────────────────
// Targeted: edit target amount + date.
// Open: edit name only (no target, no date).

function EditPotModal({ pot, onSave, onClose }) {
  const [target,     setTarget]     = useState(pot.target_amount ?? '')
  const [targetDate, setTargetDate] = useState(pot.target_date   ?? '')
  const [name,       setName]       = useState(pot.name)
  const [saving,     setSaving]     = useState(false)

  async function handleSave() {
    setSaving(true)
    if (pot.mode === 'open') {
      await onSave(pot.id, { name: name.trim() })
    } else {
      await onSave(pot.id, { name: name.trim(), target_amount: parseFloat(target), target_date: targetDate })
    }
    onClose()
  }

  return (
    <Sheet onClose={onClose}>
      <div>
        <h2 className="text-base font-bold" style={{ color: t.textPrimary }}>Edit — {pot.name}</h2>
        {pot.mode !== 'open' && (
          <p className="text-xs mt-1" style={{ color: t.textMuted }}>The linked fixed outgoing updates automatically.</p>
        )}
      </div>

      <div>
        <FieldLabel>Name</FieldLabel>
        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-3 rounded-xl text-base outline-none focus:ring-1 focus:ring-violet-500" style={inputStyle} />
      </div>

      {pot.mode !== 'open' && (
        <>
          <div>
            <FieldLabel>Target amount (£)</FieldLabel>
            <input type="number" value={target} onChange={e => setTarget(e.target.value)} className="w-full px-3 py-3 rounded-xl text-base outline-none focus:ring-1 focus:ring-violet-500" style={inputStyle} />
          </div>
          <div>
            <FieldLabel>Target date</FieldLabel>
            <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="w-full px-3 py-3 rounded-xl text-base outline-none focus:ring-1 focus:ring-violet-500" style={inputStyle} />
          </div>
        </>
      )}

      <div className="flex gap-2 pt-1">
        <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-medium" style={{ backgroundColor: 'var(--color-pill-bg)', color: t.textSecondary }}>Cancel</button>
        <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-50" style={{ backgroundColor: t.purple, color: '#fff' }}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </Sheet>
  )
}

// ── Transaction modal ─────────────────────────────────────────────
// Targeted pots: deposit/withdrawal with amount + date + note.
//   No split picker — fixed outgoing handles deductions.
// Open pots:     same fields + mandatory split picker.
//   The split must sum to the total amount before save is allowed.

function TransactionModal({ pot, onSave, onClose }) {
  const today = new Date().toISOString().slice(0, 10)
  const isOpen = pot.mode === 'open'

  const [txType,       setTxType]       = useState('deposit')
  const [amount,       setAmount]       = useState('')
  const [date,         setDate]         = useState(today)
  const [note,         setNote]         = useState('')
  const [matthewShare, setMatthewShare] = useState(null)
  const [maddyShare,   setMaddyShare]   = useState(null)
  const [saving,       setSaving]       = useState(false)
  const [err,          setErr]          = useState(null)

  const total = parseFloat(amount) || 0

  // When amount changes and open mode, reset shares so user explicitly picks split
  function handleAmountChange(val) {
    setAmount(val)
    if (isOpen) {
      setMatthewShare(null)
      setMaddyShare(null)
    }
  }

  function handleSplitChange(m, md) {
    setMatthewShare(m)
    setMaddyShare(md)
  }

  async function handleSave() {
    if (!amount || total <= 0) { setErr('Enter a positive amount.'); return }
    if (!date) { setErr('Date is required.'); return }
    if (isOpen) {
      if (matthewShare == null || maddyShare == null) {
        setErr('Enter how much comes from Matthew and Maddy.')
        return
      }
      if (Math.abs(matthewShare + maddyShare - total) > 0.01) {
        setErr(`Shares must add up to ${currency(total)}.`)
        return
      }
    }
    setSaving(true)
    setErr(null)
    try {
      await onSave(pot.id, {
        type:         txType,
        amount:       total,
        transaction_date: date,
        note,
        matthewShare: isOpen ? matthewShare : undefined,
        maddyShare:   isOpen ? maddyShare   : undefined,
      })
      onClose()
    } catch (e) { setErr(e.message); setSaving(false) }
  }

  const isWithdrawal = txType === 'withdrawal'
  const actionLabel  = isWithdrawal ? 'withdrawal' : 'deposit'

  return (
    <Sheet onClose={onClose}>
      <div>
        <h2 className="text-base font-bold" style={{ color: t.textPrimary }}>Log transaction</h2>
        <p className="text-xs mt-1" style={{ color: t.textMuted }}>
          {pot.name}
          {isOpen && <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ backgroundColor: t.violetBg, color: t.violet }}>Open</span>}
        </p>
      </div>

      {/* Deposit / Withdrawal toggle */}
      <div className="grid grid-cols-2 gap-2">
        {['deposit', 'withdrawal'].map(type => (
          <button
            key={type}
            onClick={() => { setTxType(type); setErr(null) }}
            className="py-2.5 rounded-xl text-sm font-semibold capitalize transition-all"
            style={{
              backgroundColor: txType === type ? (type === 'deposit' ? t.greenDim : t.redDim) : 'var(--color-pill-bg)',
              color: txType === type ? (type === 'deposit' ? t.green : t.red) : t.textMuted,
              border: `1px solid ${txType === type ? (type === 'deposit' ? 'rgba(52,211,153,0.3)' : 'rgba(244,63,94,0.3)') : 'transparent'}`,
            }}
          >
            {type === 'deposit' ? '+ Deposit' : '− Withdrawal'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Amount (£)</FieldLabel>
          <input
            type="number"
            value={amount}
            onChange={e => handleAmountChange(e.target.value)}
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
          placeholder="e.g. Monthly transfer"
          className="w-full px-3 py-3 rounded-xl text-base outline-none focus:ring-1 focus:ring-violet-500"
          style={inputStyle}
        />
      </div>

      {/* Open mode: mandatory split picker */}
      {isOpen && total > 0 && (
        <SplitPicker
          total={total}
          matthewShare={matthewShare}
          maddyShare={maddyShare}
          onChange={handleSplitChange}
        />
      )}
      {isOpen && total > 0 && (
        <p className="text-[10px] -mt-2" style={{ color: t.textMuted }}>
          {isWithdrawal
            ? 'Withdrawal credits each person\'s disposable by their share.'
            : 'Deposit deducts from each person\'s disposable immediately.'}
        </p>
      )}

      {err && <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: t.redDim, color: t.red }}>{err}</p>}

      <div className="flex gap-2 pt-1">
        <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-medium" style={{ backgroundColor: 'var(--color-pill-bg)', color: t.textSecondary }}>Cancel</button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
          style={{ backgroundColor: isWithdrawal ? t.red : t.purple, color: '#fff' }}
        >
          {saving ? 'Saving…' : `Log ${actionLabel}`}
        </button>
      </div>
    </Sheet>
  )
}

function fmtDate(d) {
  try { return format(parseISO(d), 'd MMM yyyy') } catch { return d ?? '' }
}

// ── Main component ────────────────────────────────────────────────

export default function JointSavings() {
  const {
    pots, transactionsForPot, loading,
    createPot, updatePot, removePot, addTransaction, removeTransaction,
  } = useJointSavings()

  const [adding,   setAdding]   = useState(false)
  const [editPot,  setEditPot]  = useState(null)
  const [txPot,    setTxPot]    = useState(null)
  const [expanded, setExpanded] = useState(null)

  async function handleDelete(id, mode) {
    const msg = mode === 'open'
      ? 'Delete this savings pot?'
      : 'Delete this savings pot? The linked fixed outgoing will also be removed.'
    if (confirm(msg)) await removePot(id)
  }
  async function handleRemoveTx(id) {
    if (confirm('Remove this transaction?')) await removeTransaction(id)
  }

  if (loading) {
    return <div className="rounded-2xl p-5" style={cardStyle}><p className="text-xs" style={{ color: t.textMuted }}>Loading…</p></div>
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

        {pots.length === 0 && (
          <p className="text-sm py-1" style={{ color: t.textMuted }}>No savings pots yet.</p>
        )}

        <div className="space-y-3">
          {pots.map(pot => {
            const potTxns  = transactionsForPot(pot.id)
            const balance  = calcSavingsBalance(potTxns)
            const isExpanded = expanded === pot.id
            const isOpenMode = pot.mode === 'open'

            // Targeted-only vars
            const target   = Number(pot.target_amount ?? 0)
            const monthly  = !isOpenMode ? calcSavingsMonthlyRequired(pot, potTxns) : 0
            const pct      = !isOpenMode && target > 0 ? Math.min((balance / target) * 100, 100) : 0
            const done     = !isOpenMode && balance >= target && target > 0

            return (
              <div key={pot.id} className="rounded-xl overflow-hidden" style={surfaceStyle}>
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <button className="flex-1 min-w-0 text-left" onClick={() => setExpanded(isExpanded ? null : pot.id)}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold" style={{ color: t.textPrimary }}>{pot.name}</p>
                        {isOpenMode && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ backgroundColor: t.violetBg, color: t.violet }}>
                            Open
                          </span>
                        )}
                      </div>
                      {!isOpenMode && (
                        <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>
                          Target: {fmtDate(pot.target_date)}
                        </p>
                      )}
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      {!isOpenMode && done && (
                        <span className="text-xs px-2 py-0.5 rounded-md font-semibold" style={{ backgroundColor: t.greenDim, color: t.green }}>
                          Complete
                        </span>
                      )}
                      {!isOpenMode && !done && (
                        <div className="text-right mr-1">
                          <p className="text-xs font-bold tabular-nums" style={{ color: t.violet }}>{currency(monthly)}/mo</p>
                          <p className="text-[10px]" style={{ color: t.textMuted }}>guide</p>
                        </div>
                      )}
                      <button onClick={() => setEditPot(pot)} className="p-2 rounded-lg active:bg-white/10" style={{ color: t.textMuted }}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-3 1 1-3a4 4 0 01.828-1.414z" />
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(pot.id, pot.mode)} className="p-2 rounded-lg active:bg-white/10" style={{ color: t.textMuted }}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Targeted: progress bar */}
                  {!isOpenMode && (
                    <>
                      <ProgressBar pct={pct} />
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold tabular-nums" style={{ color: t.violet }}>{currency(balance)} saved</span>
                        <span style={{ color: t.textMuted }}>of {currency(target)}</span>
                      </div>
                    </>
                  )}

                  {/* Open: running total */}
                  {isOpenMode && (
                    <div className="flex justify-between text-xs items-center">
                      <span style={{ color: t.textMuted }}>Running total</span>
                      <span className="text-lg font-bold tabular-nums" style={{ color: t.violet }}>{currency(balance)}</span>
                    </div>
                  )}

                  <button
                    onClick={() => setTxPot(pot)}
                    className="w-full py-2.5 rounded-lg text-xs font-semibold transition-colors active:brightness-90"
                    style={{ backgroundColor: 'rgba(128,128,128,0.08)', color: t.textSecondary, border: `1px solid ${t.divider}` }}
                  >
                    + Log deposit / withdrawal
                  </button>
                </div>

                {/* Transaction history (expanded) */}
                {isExpanded && (
                  <div style={{ borderTop: `1px solid ${t.divider}` }}>
                    {potTxns.length === 0 ? (
                      <p className="px-4 py-3 text-xs" style={{ color: t.textMuted }}>No transactions logged yet.</p>
                    ) : (
                      potTxns.map(tx => (
                        <div
                          key={tx.id}
                          className="flex items-start justify-between px-4 py-2.5"
                          style={{ borderBottom: `1px solid ${t.divider}` }}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold" style={{ color: tx.type === 'withdrawal' ? t.red : t.green }}>
                              {tx.type === 'withdrawal' ? '−' : '+'}{currency(tx.amount)}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>
                              {fmtDate(tx.transaction_date ?? tx.month)}
                              {tx.note ? ` · ${tx.note}` : ''}
                            </p>
                            {/* Show per-person split for open mode */}
                            {(tx.matthew_share != null || tx.maddy_share != null) && (
                              <p className="text-[10px] mt-0.5" style={{ color: t.textMuted }}>
                                Matthew {currency(tx.matthew_share ?? 0)} · Maddy {currency(tx.maddy_share ?? 0)}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemoveTx(tx.id)}
                            className="p-2 rounded-lg active:bg-white/10 ml-2 shrink-0"
                            style={{ color: t.textMuted }}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {adding  && <NewPotModal onSave={createPot} onClose={() => setAdding(false)} />}
      {editPot && <EditPotModal pot={editPot} onSave={updatePot} onClose={() => setEditPot(null)} />}
      {txPot   && <TransactionModal pot={txPot} onSave={addTransaction} onClose={() => setTxPot(null)} />}
    </>
  )
}
