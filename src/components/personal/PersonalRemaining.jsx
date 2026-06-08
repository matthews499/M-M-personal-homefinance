import { useDashboard } from '../../hooks/useDashboard'
import { usePersonalVariable } from '../../hooks/usePersonalVariable'
import { usePersonalMisc } from '../../hooks/usePersonalMisc'
import { useTransfers } from '../../hooks/useTransfers'
import { currency } from '../../utils/format'
import { sumAmount } from '../../utils/calculations'
import { t } from '../../utils/theme'
import { getCurrentPeriod, getPeriodDateRange } from '../../utils/payCycle'

export default function PersonalRemaining({ period }) {
  const activePeriod = period ?? getCurrentPeriod()
  const { start, end } = getPeriodDateRange(activePeriod)

  const { derived, loading: dashLoading }      = useDashboard()
  const { categories, loading: varLoading }    = usePersonalVariable()
  const { items: miscItems, loading: miscLoading } = usePersonalMisc()
  const { transferNetForUser }                 = useTransfers()

  const loading = dashLoading || varLoading || miscLoading

  if (loading || !derived) {
    return (
      <div className="rounded-2xl p-5" style={{ backgroundColor: 'rgba(129,140,248,0.10)', border: `1px solid rgba(129,140,248,0.20)` }}>
        <p className="text-xs" style={{ color: t.textMuted }}>Loading…</p>
      </div>
    )
  }

  // Apply transfer net so this figure matches what the dashboard shows
  const transferNet      = transferNetForUser(activePeriod, derived.me.user_id)
  const adjustedDisposable = derived.myDisposable + transferNet

  const varBudget = categories.reduce((acc, c) => acc + Number(c.monthly_budget), 0)
  const miscTotal = sumAmount(miscItems.filter(i => i.expense_date >= start && i.expense_date <= end))
  const remaining = adjustedDisposable - varBudget - miscTotal
  const positive  = remaining >= 0

  return (
    <div
      className="rounded-2xl px-5 py-4"
      style={{
        backgroundColor: positive ? 'rgba(52,211,153,0.08)' : 'rgba(244,63,94,0.08)',
        border: `1px solid ${positive ? 'rgba(52,211,153,0.20)' : 'rgba(244,63,94,0.20)'}`,
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: positive ? t.green : t.red }}>
        Remaining this period
      </p>
      <p className="text-3xl font-bold tracking-tight tabular-nums" style={{ color: positive ? t.green : t.red }}>
        {currency(remaining)}
      </p>
      <div className="flex gap-4 mt-2.5 flex-wrap">
        <span className="text-xs" style={{ color: t.textMuted }}>
          Disposable{' '}
          <span className="font-semibold" style={{ color: t.textSecondary }}>{currency(adjustedDisposable)}</span>
        </span>
        <span className="text-xs" style={{ color: t.textMuted }}>
          Var budget{' '}
          <span className="font-semibold" style={{ color: t.textSecondary }}>−{currency(varBudget)}</span>
        </span>
        {miscTotal > 0 && (
          <span className="text-xs" style={{ color: t.textMuted }}>
            Misc{' '}
            <span className="font-semibold" style={{ color: t.textSecondary }}>−{currency(miscTotal)}</span>
          </span>
        )}
        {transferNet !== 0 && (
          <span className="text-xs" style={{ color: transferNet > 0 ? t.green : t.red }}>
            Transfers{' '}
            <span className="font-semibold">{transferNet > 0 ? '+' : '−'}{currency(Math.abs(transferNet))}</span>
          </span>
        )}
      </div>
    </div>
  )
}
