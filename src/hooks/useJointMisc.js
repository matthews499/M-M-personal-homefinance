import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { broadcast, listenFor } from '../utils/broadcast'
import { createExpenseTasks } from '../utils/createExpenseTasks'

const KEY = 'joint-misc'

export function useJointMisc() {
  const { session } = useAuth()
  const userId = session?.user?.id

  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('joint_misc_expenses')
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

  function miscForMonth(month) {
    const prefix = month.slice(0, 7)
    return items.filter(i => i.expense_date.startsWith(prefix))
  }

  /**
   * Create a joint misc expense and apply the chosen deduction:
   *
   * deduction_type = 'variable' (default):
   *   Spreads the amount proportionally across all joint variable categories
   *   as joint_transactions.  Does NOT appear in miscThisMonth totals because
   *   it will already be counted in variable spending.
   *   NOTE: the misc record is stored with deduction_type='variable' so
   *   JointRemaining can exclude it from the misc subtotal.
   *
   * deduction_type = 'personal':
   *   Saves the misc record normally (reduces joint pot).
   *   Creates expense_topup tasks for both users so they each top up their share.
   *
   * fields: { name, amount, expense_date, deduction_type, custom_split_ratio? }
   */
  async function create(fields) {
    const { deduction_type = 'variable', custom_split_ratio, ...coreFields } = fields

    if (deduction_type === 'variable') {
      // Save the misc record as an audit entry only.
      // The joint budget card adds variable-type misc to the total budget figure
      // (expanding what's available) and includes it in amount-spent, so the
      // progress bar correctly reflects this spend — no joint_transactions needed.
      await supabase.from('joint_misc_expenses').insert({
        ...coreFields,
        deduction_type,
        custom_split_ratio: null,
      })
      broadcast('joint-variable') // refresh variable spending views

    } else {
      // 'personal' deduction — save misc record then create tasks
      const { data: miscRow, error } = await supabase
        .from('joint_misc_expenses')
        .insert({ ...coreFields, deduction_type, custom_split_ratio: custom_split_ratio ?? null })
        .select()
        .single()
      if (error) throw new Error(error.message)

      // Create expense_topup tasks for both users
      createExpenseTasks({
        expenseId:     miscRow.id,
        expenseType:   null,   // no constraint-checked type for misc
        expenseName:   coreFields.name,
        expenseAmount: Number(coreFields.amount),
        customRatio:   custom_split_ratio ?? null,
      }).catch(e => console.warn('[useJointMisc] task creation failed:', e.message))
    }

    await fetch()
    broadcast(KEY)
  }

  async function update(id, fields) {
    const { error } = await supabase.from('joint_misc_expenses').update(fields).eq('id', id)
    if (error) throw new Error(error.message)
    await fetch()
    broadcast(KEY)
  }

  async function remove(id) {
    const { error } = await supabase.from('joint_misc_expenses').delete().eq('id', id)
    if (error) throw new Error(error.message)
    await fetch()
    broadcast(KEY)
  }

  return { items, loading, error, miscForMonth, create, update, remove, refetch: fetch }
}
