import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { broadcast, listenFor } from '../utils/broadcast'

const KEY = 'joint-misc'

export function useJointMisc() {
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

  async function create(fields) {
    const { error } = await supabase.from('joint_misc_expenses').insert(fields).select()
    if (error) throw new Error(error.message)
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
