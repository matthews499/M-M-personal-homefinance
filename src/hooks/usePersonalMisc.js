import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { broadcast, listenFor } from '../utils/broadcast'

const KEY = 'personal-misc'

export function usePersonalMisc() {
  const { session } = useAuth()
  const userId = session?.user?.id

  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const fetch = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('personal_misc_expenses')
      .select('*')
      .eq('user_id', userId)
      .order('expense_date', { ascending: false })
    if (error) setError(error.message)
    else setItems(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetch()
    return listenFor(KEY, fetch)
  }, [fetch])

  function miscForMonth(month) {
    const prefix = month.slice(0, 7)
    return items.filter(i => i.expense_date.startsWith(prefix))
  }

  async function create(fields) {
    const { error } = await supabase
      .from('personal_misc_expenses')
      .insert({ ...fields, user_id: userId })
      .select()
    if (error) throw new Error(error.message)
    await fetch()
    broadcast(KEY)
  }

  async function update(id, fields) {
    const { error } = await supabase.from('personal_misc_expenses').update(fields).eq('id', id)
    if (error) throw new Error(error.message)
    await fetch()
    broadcast(KEY)
  }

  async function remove(id) {
    const { error } = await supabase.from('personal_misc_expenses').delete().eq('id', id)
    if (error) throw new Error(error.message)
    await fetch()
    broadcast(KEY)
  }

  return { items, loading, error, miscForMonth, create, update, remove, refetch: fetch }
}
