import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export function usePersonalFixed() {
  const { session } = useAuth()
  const userId = session?.user?.id

  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const fetch = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('personal_fixed_costs')
      .select('*')
      .eq('user_id', userId)
      .order('day_of_month')
    if (error) setError(error.message)
    else setItems(data)
    setLoading(false)
  }, [userId])

  useEffect(() => { fetch() }, [fetch])

  async function create(fields) {
    const { error } = await supabase
      .from('personal_fixed_costs')
      .insert({ ...fields, user_id: userId })
    if (error) throw new Error(error.message)
    await fetch()
  }

  async function update(id, fields) {
    const { error } = await supabase
      .from('personal_fixed_costs')
      .update(fields)
      .eq('id', id)
    if (error) throw new Error(error.message)
    await fetch()
  }

  async function remove(id) {
    const { error } = await supabase
      .from('personal_fixed_costs')
      .delete()
      .eq('id', id)
    if (error) throw new Error(error.message)
    await fetch()
  }

  return { items, loading, error, refetch: fetch, create, update, remove }
}
