import { useDashboard } from '../../hooks/useDashboard'
import { usePersonalFixed } from '../../hooks/usePersonalFixed'
import { usePersonalVariable } from '../../hooks/usePersonalVariable'
import { usePersonalSavings } from '../../hooks/usePersonalSavings'
import { currency } from '../../utils/format'
import { monthParam } from '../../utils/dates'
import { sumAmount, transactionsForMonth, calcSavingsMonthlyRequired, calcSavingsBalance } from '../../utils/calculations'
import { t, cardStyle } from '../../utils/theme'

function Row({ label, value, color, dimLabel }) {
  return (
    <div className="flex justify-between items-baseline py-2.5" style={{ borderBottom: `1px solid ${t.divider}` }}>
      <span className="text-sm" style={{ color: dimLabel ? t.textMuted : t.textSecondary }}>{label}</span>
      <span className="text-sm font-semibold tabular-nums" style={{ color: color ?? t.textPrimary }}>{value}</span>
    </div>
  )
}

export default function PersonalSummary() {
  const month = monthParam()
  const { derived, loading: dashLoading } = useDashboard()
  const { items: fixedItems, loading: fixedLoading } = usePersonalFixed()
  const { transactions, loading: varLoading } = usePersonalVariable(month)
  const { pots, transactionsForPot, loading: savLoading } = usePersonalSavings()

  const loading = dashLoading || fixedLoading || varLoading || savLoading

  if (loading || !derived) {
    return (
      <div className="rounded-2xl p-5" style={cardStyle}>
        <p className="text-xs" style={{ color: t.textMuted }}>Loading…</p>
      </div>
    )
  }

  const { me, myDisposable } = derived

  const salary        = Number(me.salary)
  const fixedTotal    = sumAmount(fixedItems)
  const available     = salary - fixedTotal
  // Actual joint contribution = what's left after subtracting the personal disposable share
  const jointContrib  = available - myDisposable
  const varSpent      = sumAmount(transactionsForMonth(transactions, month))

  // Targeted-mode savings only — open-mode deposits deduct at time of logging
  // and are already reflected in the personal misc / variable totals.
  const targetedSavingsCommitment = pots
    .filter(p => p.mode !== 'open')
    .reduce((acc, pot) => {
      const txns    = transactionsForPot(pot.id)
      const balance = calcSavingsBalance(txns)
      const target  = Number(pot.target_amount ?? 0)
      if (balance >= target) return acc
      return acc + calcSavingsMonthlyRequired(pot, txns)
    }, 0)

  // True disposable = allocated share − pre-committed savings
  const trueDisposable = myDisposable - targetedSavingsCommitment
  const remaining      = trueDisposable - varSpent

  return (
    <div className="rounded-2xl p-5 space-y-1" style={cardStyle}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: t.textMuted }}>Your finances this month</p>
        <span className="text-xs px-2 py-0.5 rounded-md font-semibold" style={{ backgroundColor: t.greenDim, color: t.green }}>Private</span>
      </div>

      <Row label="Salary"               value={currency(salary)} />
      <Row label="Personal fixed costs" value={`−${currency(fixedTotal)}`}        color={fixedTotal > 0 ? t.red : t.textPrimary} />
      <Row label="Joint contribution"   value={`−${currency(jointContrib)}`}      color={t.textMuted} dimLabel />
      {targetedSavingsCommitment > 0 && (
        <Row label="Savings commitment"   value={`−${currency(targetedSavingsCommitment)}`} color={t.textMuted} dimLabel />
      )}
      <Row label="Personal variable"    value={`−${currency(varSpent)}`}          color={varSpent > 0 ? t.red : t.textPrimary} />

      <div className="flex items-baseline justify-between pt-4">
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: t.textMuted }}>Disposable remaining</span>
        <span className="text-2xl font-bold tracking-tight tabular-nums" style={{ color: remaining >= 0 ? t.green : t.red }}>
          {currency(remaining)}
        </span>
      </div>
    </div>
  )
}
