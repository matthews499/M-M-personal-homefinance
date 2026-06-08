import { useEffect } from 'react'
import { useDashboard } from '../../hooks/useDashboard'
import { usePersonalSavings } from '../../hooks/usePersonalSavings'
import { useTransfers } from '../../hooks/useTransfers'
import { currency } from '../../utils/format'
import { calcSavingsMonthlyRequired, calcSavingsBalance } from '../../utils/calculations'
import { checkDisposableAlerts } from '../../utils/checkDisposableAlerts'
import { t } from '../../utils/theme'
import { getCurrentPeriod } from '../../utils/payCycle'

export default function PersonalRemaining({ period }) {
  const activePeriod = period ?? getCurrentPeriod()

  const { derived, loading: dashLoading, psLoading }           = useDashboard()
  const { pots, transactionsForPot, loading: savLoading } = usePersonalSavings()
  const { transferNetForUser }                            = useTransfers()

  // Wait for both main data and personal summaries (var_spent / misc_total)
  const loading = dashLoading || psLoading || savLoading

  // Monthly savings commitment across all pots
  const savingsCommitment = pots.reduce((acc, pot) => {
    if (pot.mode === 'open') {
      return acc + Number(pot.monthly_commitment ?? 0)
    }
    // targeted — use the auto monthly guide
    const txns    = transactionsForPot(pot.id)
    const balance = calcSavingsBalance(txns)
    const target  = Number(pot.target_amount ?? 0)
    if (balance >= target) return acc // already complete
    return acc + calcSavingsMonthlyRequired(pot, txns)
  }, 0)

  // Fire disposable alerts (safe to call every render — dedup_key prevents duplicates)
  // Uses actual var_spent from derived.mySummary (not the budget allocation).
  useEffect(() => {
    if (!derived || loading) return
    const transferNet        = transferNetForUser(activePeriod, derived.me.user_id)
    const adjustedDisposable = derived.myDisposable + transferNet
    const varSpent           = Number(derived.mySummary.var_spent  ?? 0)
    const miscTotal          = Number(derived.mySummary.misc_total ?? 0)
    const spent              = varSpent + miscTotal + savingsCommitment
    checkDisposableAlerts({
      userId:     derived.me.user_id,
      period:     activePeriod,
      disposable: adjustedDisposable,
      spent,
    })
  }, [derived, loading, savingsCommitment, activePeriod, transferNetForUser])

  if (loading || !derived) {
    return (
      <div className="rounded-2xl p-5" style={{ backgroundColor: 'rgba(129,140,248,0.10)', border: `1px solid rgba(129,140,248,0.20)` }}>
        <p className="text-xs" style={{ color: t.textMuted }}>Loading…</p>
      </div>
    )
  }

  const transferNet        = transferNetForUser(activePeriod, derived.me.user_id)
  const adjustedDisposable = derived.myDisposable + transferNet

  // Use actual spending from the RPC summary, not budget allocation
  const varSpent  = Number(derived.mySummary.var_spent  ?? 0)
  const miscTotal = Number(derived.mySummary.misc_total ?? 0)

  const totalSpent = varSpent + miscTotal + savingsCommitment
  const remaining  = adjustedDisposable - totalSpent
  const positive   = remaining >= 0

  const spentPct = adjustedDisposable > 0
    ? Math.min((totalSpent / adjustedDisposable) * 100, 100)
    : 0

  // Progress bar colour — green → amber → red
  const barColor = spentPct >= 80 ? t.red : spentPct >= 50 ? t.amber : t.green

  return (
    <div
      className="rounded-2xl px-5 py-4 space-y-3"
      style={{
        backgroundColor: positive ? 'rgba(52,211,153,0.08)' : 'rgba(244,63,94,0.08)',
        border: `1px solid ${positive ? 'rgba(52,211,153,0.20)' : 'rgba(244,63,94,0.20)'}`,
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: positive ? t.green : t.red }}>
            Remaining this period
          </p>
          <p className="text-3xl font-bold tracking-tight tabular-nums" style={{ color: positive ? t.green : t.red }}>
            {currency(remaining)}
          </p>
        </div>
        <div className="text-right mt-1">
          <p className="text-2xl font-bold tabular-nums" style={{ color: spentPct >= 80 ? t.red : spentPct >= 50 ? t.amber : t.textMuted }}>
            {Math.round(spentPct)}%
          </p>
          <p className="text-[10px]" style={{ color: t.textMuted }}>of disposable spent</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(128,128,128,0.15)' }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${spentPct}%`, backgroundColor: barColor }}
        />
      </div>

      {/* Breakdown */}
      <div className="flex gap-4 flex-wrap">
        <span className="text-xs" style={{ color: t.textMuted }}>
          Disposable{' '}
          <span className="font-semibold" style={{ color: t.textSecondary }}>{currency(adjustedDisposable)}</span>
        </span>
        {varSpent > 0 && (
          <span className="text-xs" style={{ color: t.textMuted }}>
            Var spent{' '}
            <span className="font-semibold" style={{ color: t.textSecondary }}>−{currency(varSpent)}</span>
          </span>
        )}
        {miscTotal > 0 && (
          <span className="text-xs" style={{ color: t.textMuted }}>
            Misc{' '}
            <span className="font-semibold" style={{ color: t.textSecondary }}>−{currency(miscTotal)}</span>
          </span>
        )}
        {savingsCommitment > 0 && (
          <span className="text-xs" style={{ color: t.textMuted }}>
            Savings{' '}
            <span className="font-semibold" style={{ color: t.textSecondary }}>−{currency(savingsCommitment)}</span>
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
