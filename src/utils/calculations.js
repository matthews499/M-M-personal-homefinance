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

// ── Joint contribution ───────────────────────────────────────

// What one person contributes to the joint pot this month
export function calcJointContribution(salary, personalFixedCosts = []) {
  return Number(salary) - sumAmount(personalFixedCosts)
}

// ── Joint pot balance ────────────────────────────────────────

/**
 * Joint pot balance for the current month.
 *
 * balance = (matthew_contrib + maddy_contrib)
 *         - sum(joint_fixed_outgoings)      ← includes savings auto-entries
 *         - sum(joint_transactions this month)
 */
export function calcJointBalance({
  matthewSalary,
  matthewPersonalFixed,
  maddySalary,
  maddyPersonalFixed,
  jointFixed = [],
  jointCategories = [],
}) {
  const matthewContrib = calcJointContribution(matthewSalary, matthewPersonalFixed)
  const maddyContrib   = calcJointContribution(maddySalary,   maddyPersonalFixed)
  const totalIn        = matthewContrib + maddyContrib
  const totalFixed     = sumAmount(jointFixed)
  const totalVarBudget = jointCategories.reduce((acc, c) => acc + Number(c.monthly_budget), 0)
  return totalIn - totalFixed - totalVarBudget
}

// ── Disposable income ────────────────────────────────────────

// Each person's share of the joint surplus
export function calcDisposable(jointBalance, matthewRatio, isMatthew) {
  const ratio = isMatthew ? Number(matthewRatio) : 1 - Number(matthewRatio)
  return jointBalance * ratio
}

// Personal disposable = surplus share (joint surplus already accounts for their contribution)
// Personal variable spending is tracked separately in personal section
export function calcPersonalDisposable(jointBalance, matthewRatio, isMatthew, personalVariableSpent = 0) {
  return calcDisposable(jointBalance, matthewRatio, isMatthew) - personalVariableSpent
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
