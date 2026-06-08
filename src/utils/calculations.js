import { monthParam, monthsUntil } from './dates'

// ── Helpers ─────────────────────────────────────────────────

export function sumAmount(items = []) {
  return items.reduce((acc, i) => acc + Number(i.amount), 0)
}

// Transactions that fall in the given month (YYYY-MM-DD string)
export function transactionsForMonth(transactions = [], month) {
  const prefix = month.slice(0, 7) // 'YYYY-MM'
  return transactions.filter(t => t.transaction_date.startsWith(prefix))
}

// ── Contribution model (correct) ────────────────────────────
//
//   available    = salary − personal_fixed_total      (per person)
//   total_avail  = Σ available
//   joint_costs  = Σ joint_fixed + Σ var_budgets
//   total_disp   = total_avail − joint_costs
//   disposable   = total_disp × ratio                 (per person)
//   contribution = available − disposable              (derived)
//
// These are now computed server-side in get_joint_contributions().
// The helpers below are kept for the What-if calculator which does
// its own in-browser projection without hitting the DB.

export function calcAvailable(salary, personalFixedTotal) {
  return Number(salary) - Number(personalFixedTotal)
}

export function calcTotalDisposable(totalAvailable, jointFixedTotal, varBudgetTotal) {
  return totalAvailable - jointFixedTotal - varBudgetTotal
}

// Each person's share of total disposable
export function calcDisposable(totalDisposable, matthewRatio, isMatthew) {
  const ratio = isMatthew ? Number(matthewRatio) : 1 - Number(matthewRatio)
  return totalDisposable * ratio
}

// Derived contribution = available − disposable
export function calcContribution(available, disposable) {
  return available - disposable
}

// ── Legacy helpers (kept for backward compat) ────────────────

export function calcJointContribution(salary, personalFixedCosts = []) {
  return Number(salary) - sumAmount(personalFixedCosts)
}

export function calcPersonalDisposable(totalDisposable, matthewRatio, isMatthew, personalVariableSpent = 0) {
  return calcDisposable(totalDisposable, matthewRatio, isMatthew) - personalVariableSpent
}

// ── Savings pots ─────────────────────────────────────────────

// Net balance from all logged transactions (deposits add, withdrawals subtract)
export function calcSavingsBalance(transactions = []) {
  return transactions.reduce((sum, tx) => {
    const sign = tx.type === 'withdrawal' ? -1 : 1
    return sum + sign * Number(tx.amount)
  }, 0)
}

// Backward-compat alias
export function calcSavingsDeposited(transactions = []) {
  return calcSavingsBalance(transactions)
}

// Monthly contribution needed to hit the target by the target date (guide only)
export function calcSavingsMonthlyRequired(pot, transactions = []) {
  const remaining = Number(pot.target_amount) - calcSavingsBalance(transactions)
  if (remaining <= 0) return 0
  return remaining / monthsUntil(pot.target_date)
}

// ── Budget progress ──────────────────────────────────────────

export function calcBudgetProgress(category, transactions = [], month = monthParam()) {
  const spent     = sumAmount(transactionsForMonth(transactions, month))
  const budget    = Number(category.monthly_budget)
  const remaining = budget - spent
  const pct       = budget > 0 ? (spent / budget) * 100 : 0
  return { spent, budget, remaining, pct }
}

export function is80PctBreached(category, transactions, month = monthParam()) {
  const { pct } = calcBudgetProgress(category, transactions, month)
  return pct >= 80
}
