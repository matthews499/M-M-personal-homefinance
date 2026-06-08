import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { broadcast, listenFor } from '../utils/broadcast'
import { createExpenseTasks } from '../utils/createExpenseTasks'

const KEY = 'joint-fixed'

export function useJointFixed() {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('joint_fixed_outgoings')
      .select('*')
      .order('day_of_month')
    if (error) setError(error.message)
    else setItems(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch()
    return listenFor(KEY, fetch)
  }, [fetch])

  async function create(fields) {
    const { data, error } = await supabase
      .from('joint_fixed_outgoings')
      .insert(fields)
      .select()
      .single()
    if (error) throw new Error(error.message)
    await fetch()
    broadcast(KEY)
    // Create expense_topup tasks for both users (fire-and-forget, non-blocking)
    createExpenseTasks({
      expenseId:     data.id,
      expenseType:   'joint_fixed',
      expenseName:   fields.name,
      expenseAmount: Number(fields.amount),
    }).catch(e => console.warn('[useJointFixed] task creation failed:', e.message))
  }

  async function update(id, fields) {
    const { error } = await supabase.from('joint_fixed_outgoings').update(fields).eq('id', id)
    if (error) throw new Error(error.message)
    await fetch()
    broadcast(KEY)
  }

  async function remove(id) {
    const { error } = await supabase.from('joint_fixed_outgoings').delete().eq('id', id)
    if (error) throw new Error(error.message)
    await fetch()
    broadcast(KEY)
  }

  return { items, loading, error, refetch: fetch, create, update, remove }
}
