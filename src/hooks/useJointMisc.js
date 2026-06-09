import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { broadcast, listenFor } from '../utils/broadcast'
import { createExpenseTasks } from '../utils/createExpenseTasks'

const KEY = 'joint-misc'
const MATTHEW_UUID = 'c722d728-5abe-41fe-9965-3f5d5c69a891'
const MADDY_UUID   = '45b7ef92-2b47-47a8-ae2b-f7348271b62c'

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
      // 'personal' deduction — save misc record, pre-insert personal_misc for each user,
      // then create tasks (to remind each user to top up the joint pot).
      const { data: miscRow, error } = await supabase
        .from('joint_misc_expenses')
        .insert({ ...coreFields, deduction_type, custom_split_ratio: custom_split_ratio ?? null })
        .select()
        .single()
      if (error) throw new Error(error.message)

      // Determine split ratio
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
      const total = Number(coreFields.amount)
      const expenseDate = coreFields.expense_date ?? new Date().toISOString().slice(0, 10)

      // Pre-insert personal_misc_expenses for each user so disposable reduces immediately
      await supabase.from('personal_misc_expenses').insert([
        { user_id: MATTHEW_UUID, name: coreFields.name, amount: parseFloat((total * matthewRatio).toFixed(2)), expense_date: expenseDate },
        { user_id: MADDY_UUID,   name: coreFields.name, amount: parseFloat((total * maddyRatio  ).toFixed(2)), expense_date: expenseDate },
      ])
      broadcast('personal-misc') // update both users' disposable on dashboard immediately

      // Create expense_topup tasks for both users (to remember to transfer to joint pot)
      // related_expense_type = null so completeTask skips the double personal_misc insert
      createExpenseTasks({
        expenseId:     miscRow.id,
        expenseType:   null,
        expenseName:   coreFields.name,
        expenseAmount: total,
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
