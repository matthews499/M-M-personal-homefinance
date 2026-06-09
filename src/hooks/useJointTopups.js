import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { broadcast, listenFor } from '../utils/broadcast'
import { createExpenseTasks } from '../utils/createExpenseTasks'
import { getCurrentPeriod } from '../utils/payCycle'

const KEY = 'joint-topup'
const MATTHEW_UUID = 'c722d728-5abe-41fe-9965-3f5d5c69a891'
const MADDY_UUID   = '45b7ef92-2b47-47a8-ae2b-f7348271b62c'

export function useJointTopups() {
  const { session } = useAuth()
  const userId = session?.user?.id

  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('joint_topups')
      .select('*')
      .order('expense_date', { ascending: false })
    if (error) setError(error.message)
    else setItems(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch()
    return listenFor(KEY, fetch)
  }, [fetch])

  /**
   * Create a joint pot top-up.
   *
   * Effect on budget card:
   *   totalBudget  += amount   (remaining also increases)
   *   totalSpent    unchanged  (NOT counted as spending)
   *
   * Effect on personal disposable:
   *   personal_misc_expenses inserted for each user (their share)
   *   → useDashboard reacts to 'personal-misc' broadcast and refetches summaries
   *
   * Tasks:
   *   expense_topup task created for each user to transfer their share.
   *   related_expense_type = null → completeTask skips the double personal_misc insert.
   *
   * @param {{ amount: number, expense_date: string, note: string, period: string, custom_split_ratio?: number|null }} fields
   */
  async function create(fields) {
    const { custom_split_ratio, ...coreFields } = fields
    const period = coreFields.period ?? getCurrentPeriod()
    const expenseDate = coreFields.expense_date ?? new Date().toISOString().slice(0, 10)

    const { data: topupRow, error } = await supabase
      .from('joint_topups')
      .insert({
        ...coreFields,
        period,
        expense_date: expenseDate,
        custom_split_ratio: custom_split_ratio ?? null,
        created_by: userId,
      })
      .select()
      .single()
    if (error) throw new Error(error.message)

    // Resolve split ratio
    let matthewRatio
    if (custom_split_ratio !== null && custom_split_ratio !== undefined) {
      matthewRatio = Number(custom_split_ratio)
    } else {
      const { data: settings } = await supabase
        .from('app_settings')
        .select('matthew_split_ratio')
        .single()
      matthewRatio = Number(settings?.matthew_split_ratio ?? 0.5)
    }
    const maddyRatio = 1 - matthewRatio
    const total       = Number(coreFields.amount)
    const label       = coreFields.note?.trim() || 'Joint pot top-up'

    // Pre-insert personal_misc_expenses for each user so disposable reduces immediately
    // (RLS allows authenticated INSERT for any user_id — migration 009)
    const { error: miscErr } = await supabase.from('personal_misc_expenses').insert([
      {
        user_id:      MATTHEW_UUID,
        name:         label,
        amount:       parseFloat((total * matthewRatio).toFixed(2)),
        expense_date: expenseDate,
      },
      {
        user_id:      MADDY_UUID,
        name:         label,
        amount:       parseFloat((total * maddyRatio).toFixed(2)),
        expense_date: expenseDate,
      },
    ])
    if (miscErr) console.warn('[useJointTopups] personal_misc insert failed:', miscErr.message)

    // Broadcast so useDashboard re-fetches personal summaries
    broadcast('personal-misc')

    // Create expense_topup tasks — related_expense_type = null so completeTask
    // does NOT double-insert personal_misc on completion (already done above)
    createExpenseTasks({
      expenseId:     topupRow.id,
      expenseType:   null,
      expenseName:   label,
      expenseAmount: total,
      customRatio:   custom_split_ratio ?? null,
    }).catch(e => console.warn('[useJointTopups] task creation failed:', e.message))

    await fetch()
    broadcast(KEY)
  }

  async function remove(id) {
    const { error } = await supabase.from('joint_topups').delete().eq('id', id)
    if (error) throw new Error(error.message)
    await fetch()
    broadcast(KEY)
  }

  return { items, loading, error, create, remove, refetch: fetch }
}
