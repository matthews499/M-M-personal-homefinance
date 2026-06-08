import { useState } from 'react'
import { useAuth } from '../../lib/AuthContext'
import { useJointVariable } from '../../hooks/useJointVariable'
import { currency } from '../../utils/format'
import { calcBudgetProgress, transactionsForMonth } from '../../utils/calculations'
import { t, cardStyle, surfaceStyle, inputStyle } from '../../utils/theme'
import { getCurrentPeriod } from '../../utils/payCycle'

function SectionLabel({ children }) {
  return <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: t.textMuted }}>{children}</p>
}

function FieldLabel({ children }) {
  return <p className="text-xs font-medium mb-1.5" style={{ color: t.textMuted }}>{children}</p>
}

function ProgressBar({ pct }) {
  const capped = Math.min(pct, 100)
  const color  = pct >= 80 ? t.red : pct >= 50 ? t.amber : t.green
  return (
    <div className="h-1.5 rounded-full overflow-hidden mt-2.5" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${capped}%`, backgroundColor: color }} />
    </div>
  )
}

// ── Category modal (add + edit) ────────────────────────────────

function CategoryModal({ item, onSave, onCancel }) {
  const [name,   setName]   = useState(item?.name ?? '')
  const [budget, setBudget] = useState(item?.monthly_budget ?? '')
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState(null)

  async function handleSave() {
    if (!name.trim() || !budget) return
    setSaving(true)
    setErr(null)
    try {
      await onSave({ name: name.trim(), monthly_budget: parseFloat(budget) })
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
        <h2 className="text-base font-bold" style={{ color: t.textPrimary }}>
          {item ? 'Edit category' : 'New category'}
        </h2>
        <div>
          <FieldLabel>Category name</FieldLabel>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Food"
            autoFocus
            className="w-full px-3 py-3 rounded-xl text-base outline-none focus:ring-1 focus:ring-violet-500"
            style={inputStyle}
          />
        </div>
        <div>
          <FieldLabel>Monthly budget (£)</FieldLabel>
          <input
            type="number"
            value={budget}
            onChange={e => setBudget(e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-3 rounded-xl text-base outline-none focus:ring-1 focus:ring-violet-500"
            style={inputStyle}
          />
        </div>
        {err && (
          <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: t.redDim, color: t.red }}>{err}</p>
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
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Transaction modal ──────────────────────────────────────────

function TransactionModal({ category, transactions, onAdd, onUpdate, onDelete, onClose }) {
  // transactions are already period-filtered by the hook
  const monthTxns = transactions
  const spent     = transactions.reduce((s, tx) => s + Number(tx.amount), 0)
  const budget    = Number(category.monthly_budget)
  const remaining = budget - spent
  const pct       = budget > 0 ? Math.round((spent / budget) * 100) : 0

  const [showForm, setShowForm] = useState(false)
  const [editId,   setEditId]   = useState(null)
  const [desc,   setDesc]   = useState('')
  const [amount, setAmount] = useState('')
  const [date,   setDate]   = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)

  function openAdd() {
    setDesc(''); setAmount(''); setDate(new Date().toISOString().slice(0, 10))
    setEditId(null); setShowForm(true)
  }
  function openEdit(tx) {
    setDesc(tx.description); setAmount(tx.amount); setDate(tx.transaction_date)
    setEditId(tx.id); setShowForm(true)
  }

  async function handleSave() {
    if (!desc.trim() || !amount || !date) return
    setSaving(true)
    if (editId) await onUpdate(editId, { description: desc.trim(), amount: parseFloat(amount), transaction_date: date })
    else        await onAdd(category.id, { description: desc.trim(), amount: parseFloat(amount), transaction_date: date })
    setShowForm(false); setSaving(false)
  }

  async function handleDelete(id) {
    if (confirm('Delete this transaction?')) await onDelete(id)
  }

  const barColor = pct >= 80 ? t.red : pct >= 50 ? t.amber : t.green

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
      onClick={onClose}
    >
      <div
        className="w-full md:max-w-md rounded-t-3xl md:rounded-2xl flex flex-col"
        style={{ backgroundColor: t.card, border: `1px solid ${t.cardBorder}`, maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle (mobile) */}
        <div className="pt-3 pb-1 flex justify-center md:hidden">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Header */}
        <div className="px-5 py-4" style={{ borderBottom: `1px solid ${t.divider}` }}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-base font-bold" style={{ color: t.textPrimary }}>{category.name}</h2>
              <div className="flex flex-wrap gap-3 mt-1 text-sm tabular-nums">
                <span style={{ color: barColor }}>{currency(spent)} spent</span>
                <span style={{ color: t.textMuted }}>of {currency(budget)}</span>
                <span style={{ color: remaining >= 0 ? t.textSecondary : t.red }}>
                  {currency(Math.abs(remaining))} {remaining >= 0 ? 'left' : 'over'}
                </span>
              </div>
              <ProgressBar pct={pct} />
            </div>
            <button onClick={onClose} className="p-2 rounded-lg ml-3 active:bg-white/10" style={{ color: t.textMuted }}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* Add / edit form */}
        {showForm && (
          <div className="p-4 space-y-3" style={{ borderBottom: `1px solid ${t.divider}` }}>
            <div>
              <FieldLabel>Description</FieldLabel>
              <input type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. Tesco" autoFocus className="w-full px-3 py-3 rounded-xl text-base outline-none focus:ring-1 focus:ring-violet-500" style={inputStyle} />
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
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ backgroundColor: 'rgba(255,255,255,0.07)', color: t.textSecondary }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50" style={{ backgroundColor: t.purple, color: '#fff' }}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        )}

        {/* Transaction list */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {monthTxns.length === 0 && !showForm && (
            <p className="text-sm text-center py-6" style={{ color: t.textMuted }}>No transactions this month.</p>
          )}
          {monthTxns.map(tx => (
            <div key={tx.id} className="flex items-center justify-between px-3 py-3 rounded-xl" style={surfaceStyle}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: t.textPrimary }}>{tx.description}</p>
                <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>{tx.transaction_date}</p>
              </div>
              <span className="text-sm font-bold tabular-nums mx-3" style={{ color: t.textPrimary }}>{currency(tx.amount)}</span>
              <div className="flex gap-1">
                <button onClick={() => openEdit(tx)} className="p-2 rounded-lg active:bg-white/10" style={{ color: t.textMuted }}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-3 1 1-3a4 4 0 01.828-1.414z" /></svg>
                </button>
                <button onClick={() => handleDelete(tx.id)} className="p-2 rounded-lg active:bg-white/10" style={{ color: t.textMuted }}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 pb-6 md:pb-4" style={{ borderTop: `1px solid ${t.divider}` }}>
          <button onClick={openAdd} className="w-full py-3 rounded-xl text-sm font-semibold transition-colors" style={{ backgroundColor: t.purpleBg, color: t.purpleText }}>
            + Add transaction
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────

export default function JointVariable({ period }) {
  const { session } = useAuth()
  const userId = session?.user?.id
  const activePeriod = period ?? getCurrentPeriod()

  const {
    categories, transactions, loading,
    createCategory, updateCategory, removeCategory,
    addTransaction, updateTransaction, removeTransaction,
  } = useJointVariable(activePeriod)

  const [adding,    setAdding]    = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [openCatId, setOpenCatId] = useState(null)

  async function handleCreateCat(fields) { await createCategory(fields); setAdding(false) }
  async function handleUpdateCat(id, fields) { await updateCategory(id, fields); setEditingId(null) }
  async function handleDeleteCat(id) {
    if (confirm('Delete this category and all its transactions?')) await removeCategory(id)
  }

  const openCategory = categories.find(c => c.id === openCatId)
  const openTxns     = transactions.filter(tx => tx.category_id === openCatId)

  if (loading) {
    return (
      <div className="rounded-2xl p-5" style={cardStyle}>
        <p className="text-xs" style={{ color: t.textMuted }}>Loading…</p>
      </div>
    )
  }

  // ── Totals across all categories ─────────────────────────────
  const totalBudget = categories.reduce((s, c) => s + Number(c.monthly_budget), 0)
  const totalSpent  = transactions.reduce((s, tx) => s + Number(tx.amount), 0)
  const totalLeft   = totalBudget - totalSpent
  const totalPct    = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0
  const summaryColor = totalPct >= 80 ? t.red : totalPct >= 50 ? t.amber : t.green

  return (
    <>
      <div className="rounded-2xl p-5 space-y-5" style={cardStyle}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <SectionLabel>Variable outgoings</SectionLabel>
          <button
            onClick={() => setAdding(true)}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold"
            style={{ backgroundColor: t.purpleBg, color: t.purpleText }}
          >
            + Category
          </button>
        </div>

        {/* Variable budget summary */}
        {categories.length > 0 && (
          <div className="rounded-xl px-4 py-3.5 space-y-2.5" style={{ backgroundColor: 'rgba(128,128,128,0.06)', border: `1px solid ${t.divider}` }}>
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: t.textMuted }}>Total variable</span>
              <span className="text-xs tabular-nums font-semibold" style={{ color: summaryColor }}>{totalPct}% used</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(128,128,128,0.15)' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(totalPct, 100)}%`, backgroundColor: summaryColor }}
              />
            </div>
            <div className="flex justify-between text-sm tabular-nums">
              <div>
                <p className="text-xs mb-0.5" style={{ color: t.textMuted }}>Spent</p>
                <p className="font-bold" style={{ color: summaryColor }}>{currency(totalSpent)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs mb-0.5" style={{ color: t.textMuted }}>Budget</p>
                <p className="font-bold" style={{ color: t.textPrimary }}>{currency(totalBudget)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs mb-0.5" style={{ color: t.textMuted }}>{totalLeft >= 0 ? 'Remaining' : 'Over'}</p>
                <p className="font-bold" style={{ color: totalLeft >= 0 ? t.green : t.red }}>
                  {totalLeft >= 0 ? currency(totalLeft) : `−${currency(Math.abs(totalLeft))}`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Category list */}
        <div className="space-y-2">
          {categories.length === 0 && (
            <p className="text-sm py-1" style={{ color: t.textMuted }}>No variable categories yet.</p>
          )}

          {categories.map(cat => {
            const catTxns = transactions.filter(tx => tx.category_id === cat.id)
            const spent    = catTxns.reduce((s, tx) => s + Number(tx.amount), 0)
            const budget   = Number(cat.monthly_budget)
            const remaining = budget - spent
            const pct      = budget > 0 ? Math.round((spent / budget) * 100) : 0
            const warn = pct >= 80
            const over = pct >= 100

            return (
              <div
                key={cat.id}
                className="rounded-xl px-4 py-3.5 cursor-pointer transition-all active:brightness-90"
                style={surfaceStyle}
                onClick={() => setOpenCatId(cat.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <p className="text-sm font-bold truncate" style={{ color: t.textPrimary }}>{cat.name}</p>
                    {warn && (
                      <span
                        className="shrink-0 text-xs px-1.5 py-0.5 rounded-md font-semibold"
                        style={{
                          backgroundColor: over ? t.redDim : t.amberDim,
                          color: over ? t.red : t.amber,
                        }}
                      >
                        {over ? 'Over' : '80%'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    <span className="text-sm font-bold tabular-nums mr-1" style={{ color: t.textPrimary }}>
                      {currency(spent)}
                      <span className="font-normal text-xs ml-1" style={{ color: t.textMuted }}>/ {currency(budget)}</span>
                    </span>
                    <button onClick={() => setEditingId(cat.id)} className="p-2 rounded-lg active:bg-white/10" style={{ color: t.textMuted }}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-3 1 1-3a4 4 0 01.828-1.414z" /></svg>
                    </button>
                    <button onClick={() => handleDeleteCat(cat.id)} className="p-2 rounded-lg active:bg-white/10" style={{ color: t.textMuted }}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>

                <ProgressBar pct={pct} />

                <div className="flex justify-between mt-2 text-xs">
                  <span style={{ color: t.textMuted }}>{Math.round(pct)}% used</span>
                  <span style={{ color: remaining >= 0 ? t.textMuted : t.red }}>
                    {remaining >= 0 ? `${currency(remaining)} remaining` : `${currency(Math.abs(remaining))} over`}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {adding && (
        <CategoryModal onSave={handleCreateCat} onCancel={() => setAdding(false)} />
      )}
      {editingId && (
        <CategoryModal
          item={categories.find(c => c.id === editingId)}
          onSave={f => handleUpdateCat(editingId, f)}
          onCancel={() => setEditingId(null)}
        />
      )}
      {openCatId && openCategory && (
        <TransactionModal
          category={openCategory}
          transactions={openTxns}
          onAdd={(catId, fields) => addTransaction(catId, fields, userId)}
          onUpdate={updateTransaction}
          onDelete={removeTransaction}
          onClose={() => setOpenCatId(null)}
        />
      )}
    </>
  )
}
