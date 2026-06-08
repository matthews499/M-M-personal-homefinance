import { supabase } from '../lib/supabase'
import { getCurrentPeriod } from './payCycle'
import { broadcast } from './broadcast'

const MATTHEW_UUID = 'c722d728-5abe-41fe-9965-3f5d5c69a891'
const MADDY_UUID   = '45b7ef92-2b47-47a8-ae2b-f7348271b62c'

/**
 * Creates one expense_topup task for each user for the current period.
 *
 * @param {object} params
 * @param {string}      params.expenseId
 * @param {string|null} params.expenseType    'joint_fixed' | 'joint_variable' | null
 * @param {string}      params.expenseName
 * @param {number}      params.expenseAmount
 * @param {number|null} [params.customRatio]  Override global matthew split ratio (0–1).
 *                                            Pass null to use the app_settings value.
 */
export async function createExpenseTasks({
  expenseId,
  expenseType,
  expenseName,
  expenseAmount,
  customRatio = null,
}) {
  const period = getCurrentPeriod()

  // Determine matthew's ratio — use override if supplied, else read from settings
  let matthewRatio
  if (customRatio !== null && customRatio !== undefined) {
    matthewRatio = Number(customRatio)
  } else {
    const { data: settings } = await supabase
      .from('app_settings')
      .select('matthew_split_ratio')
      .single()
    matthewRatio = Number(settings?.matthew_split_ratio ?? 0.5)
  }
  const maddyRatio = 1 - matthewRatio

  const fmt = n => n.toFixed(2)

  const tasks = [
    {
      type:                 'expense_topup',
      user_id:              MATTHEW_UUID,
      title:                `Transfer £${fmt(expenseAmount * matthewRatio)} into joint — ${expenseName}`,
      amount:               parseFloat((expenseAmount * matthewRatio).toFixed(2)),
      period,
      related_expense_id:   expenseId,
      related_expense_type: expenseType ?? null,
    },
    {
      type:                 'expense_topup',
      user_id:              MADDY_UUID,
      title:                `Transfer £${fmt(expenseAmount * maddyRatio)} into joint — ${expenseName}`,
      amount:               parseFloat((expenseAmount * maddyRatio).toFixed(2)),
      period,
      related_expense_id:   expenseId,
      related_expense_type: expenseType ?? null,
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
