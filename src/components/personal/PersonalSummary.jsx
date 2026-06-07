import { useDashboard } from '../../hooks/useDashboard'
import { usePersonalFixed } from '../../hooks/usePersonalFixed'
import { usePersonalVariable } from '../../hooks/usePersonalVariable'
import { currency } from '../../utils/format'
import { monthParam } from '../../utils/dates'
import { sumAmount, transactionsForMonth } from '../../utils/calculations'
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

  const loading = dashLoading || fixedLoading || varLoading

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
  const jointContrib  = salary - fixedTotal
  const varSpent      = sumAmount(transactionsForMonth(transactions, month))
  const disposable    = myDisposable - varSpent

  return (
    <div className="rounded-2xl p-5 space-y-1" style={cardStyle}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: t.textMuted }}>Your finances this month</p>
        <span className="text-xs px-2 py-0.5 rounded-md font-semibold" style={{ backgroundColor: t.greenDim, color: t.green }}>Private</span>
      </div>

      <Row label="Salary"               value={currency(salary)} />
      <Row label="Personal fixed costs" value={`−${currency(fixedTotal)}`}   color={fixedTotal > 0 ? t.red : t.textPrimary} />
      <Row label="Joint contribution"   value={`−${currency(jointContrib)}`} color={t.textMuted} dimLabel />
      <Row label="Personal variable"    value={`−${currency(varSpent)}`}     color={varSpent > 0 ? t.red : t.textPrimary} />

      <div className="flex items-baseline justify-between pt-4">
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: t.textMuted }}>Disposable income</span>
        <span className="text-2xl font-bold tracking-tight tabular-nums" style={{ color: disposable >= 0 ? t.green : t.red }}>
          {currency(disposable)}
        </span>
      </div>
    </div>
  )
}
