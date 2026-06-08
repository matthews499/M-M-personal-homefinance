import { supabase } from '../lib/supabase'
import { getCurrentPeriod } from './payCycle'
import { broadcast } from './broadcast'

const MATTHEW_UUID = 'c722d728-5abe-41fe-9965-3f5d5c69a891'
const MADDY_UUID   = '45b7ef92-2b47-47a8-ae2b-f7348271b62c'

/**
 * Called after a new joint fixed outgoing or joint variable category is created.
 * Creates one expense_topup task for each user for the current period.
 *
 * Amount per user = expense amount × their ratio.
 * Uses upsert with ignoreDuplicates so re-runs are idempotent.
 */
export async function createExpenseTasks({ expenseId, expenseType, expenseName, expenseAmount }) {
  const period = getCurrentPeriod()

  // Get current split ratio
  const { data: settings } = await supabase
    .from('app_settings')
    .select('matthew_split_ratio')
    .single()

  const matthewRatio = Number(settings?.matthew_split_ratio ?? 0.5)
  const maddyRatio   = 1 - matthewRatio

  const fmt = n => n.toFixed(2)

  const tasks = [
    {
      type:                 'expense_topup',
      user_id:              MATTHEW_UUID,
      title:                `Transfer £${fmt(expenseAmount * matthewRatio)} into joint — new expense: ${expenseName}`,
      amount:               parseFloat((expenseAmount * matthewRatio).toFixed(2)),
      period,
      related_expense_id:   expenseId,
      related_expense_type: expenseType,
    },
    {
      type:                 'expense_topup',
      user_id:              MADDY_UUID,
      title:                `Transfer £${fmt(expenseAmount * maddyRatio)} into joint — new expense: ${expenseName}`,
      amount:               parseFloat((expenseAmount * maddyRatio).toFixed(2)),
      period,
      related_expense_id:   expenseId,
      related_expense_type: expenseType,
    },
  ]

  const { error } = await supabase
    .from('tasks')
    .upsert(tasks, { onConflict: 'user_id,period,related_expense_id', ignoreDuplicates: true })

  if (error) {
    console.warn('[createExpenseTasks] failed:', error.message)
    return
  }

  broadcast('tasks')
}
