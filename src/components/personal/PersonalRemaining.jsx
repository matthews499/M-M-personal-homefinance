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

  // Targeted-mode savings only — open-mode deposits deduct at time of logging
  // (via personal_misc_expenses) and are already captured in misc_total from the RPC.
  const targetedSavingsCommitment = pots
    .filter(p => p.mode !== 'open')
    .reduce((acc, pot) => {
      const txns    = transactionsForPot(pot.id)
      const balance = calcSavingsBalance(txns)
      const target  = Number(pot.target_amount ?? 0)
      if (balance >= target) return acc // pot complete — no more commitment
      return acc + calcSavingsMonthlyRequired(pot, txns)
    }, 0)

  // Fire disposable alerts once data is ready.
  // Uses trueDisposable (targeted savings already deducted) as the denominator.
  useEffect(() => {
    if (!derived || loading) return
    const tNet     = transferNetForUser(activePeriod, derived.me.user_id)
    const tOut     = Math.max(0, -tNet)
    const trueDisp = derived.myDisposable - targetedSavingsCommitment
    const varSp    = Number(derived.mySummary.var_spent  ?? 0)
    const miscTot  = Number(derived.mySummary.misc_total ?? 0)
    checkDisposableAlerts({
      userId:     derived.me.user_id,
      period:     activePeriod,
      disposable: trueDisp,
      spent:      varSp + miscTot + tOut,
    })
  }, [derived, loading, targetedSavingsCommitment, activePeriod, transferNetForUser])

  if (loading || !derived) {
    return (
      <div className="rounded-2xl p-5" style={{ backgroundColor: 'rgba(129,140,248,0.10)', border: `1px solid rgba(129,140,248,0.20)` }}>
        <p className="text-xs" style={{ color: t.textMuted }}>Loading…</p>
      </div>
    )
  }

  const transferNet  = transferNetForUser(activePeriod, derived.me.user_id)
  // Transfers out = spending (reduce remaining, counted in % numerator).
  // Transfers in  = boost remaining only (NOT in % denominator, NOT in % numerator).
  const transfersOut = Math.max(0, -transferNet)
  const transfersIn  = Math.max(0,  transferNet)

  // True disposable = allocated share − targeted savings pre-commitments.
  // This is the % denominator — never inflated/deflated by transfers.
  const trueDisposable = derived.myDisposable - targetedSavingsCommitment

  // Use actual spending totals from the RPC summary
  const varSpent  = Number(derived.mySummary.var_spent  ?? 0)
  const miscTotal = Number(derived.mySummary.misc_total ?? 0)

  // "spent" for % purposes includes transfers out (they reduce your remaining like any spend)
  const spent    = varSpent + miscTotal + transfersOut
  // remaining can exceed trueDisposable when transfers in > 0 (expected behaviour)
  const remaining = trueDisposable - spent + transfersIn
  const positive  = remaining >= 0

  // % = what you've committed out of your true disposable (can exceed 100 if overspent)
  const spentPct = trueDisposable > 0
    ? (spent / trueDisposable) * 100
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
          style={{ width: `${Math.min(spentPct, 100)}%`, backgroundColor: barColor }}
        />
      </div>

      {/* Breakdown */}
      <div className="flex gap-4 flex-wrap">
        <span className="text-xs" style={{ color: t.textMuted }}>
          Disposable{' '}
          <span className="font-semibold" style={{ color: t.textSecondary }}>{currency(trueDisposable)}</span>
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
        {targetedSavingsCommitment > 0 && (
          <span className="text-xs" style={{ color: t.textMuted }}>
            Savings{' '}
            <span className="font-semibold" style={{ color: t.textSecondary }}>−{currency(targetedSavingsCommitment)}</span>
          </span>
        )}
        {transfersOut > 0 && (
          <span className="text-xs" style={{ color: t.red }}>
            Sent{' '}
            <span className="font-semibold">−{currency(transfersOut)}</span>
          </span>
        )}
        {transfersIn > 0 && (
          <span className="text-xs" style={{ color: t.green }}>
            Received{' '}
            <span className="font-semibold">+{currency(transfersIn)}</span>
          </span>
        )}
      </div>
    </div>
  )
}
