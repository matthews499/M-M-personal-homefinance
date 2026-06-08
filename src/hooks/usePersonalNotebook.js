import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export function usePersonalNotebook() {
  const { session } = useAuth()
  const userId = session?.user?.id

  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const fetch = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('personal_notebook_entries')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
    if (error) setError(error.message)
    else setEntries(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => { fetch() }, [fetch])

  async function create(fields) {
    const { error } = await supabase
      .from('personal_notebook_entries')
      .insert({ ...fields, user_id: userId })
    if (error) throw new Error(error.message)
    await fetch()
  }

  async function update(id, fields) {
    const { error } = await supabase
      .from('personal_notebook_entries')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw new Error(error.message)
    await fetch()
  }

  async function remove(id) {
    const { error } = await supabase
      .from('personal_notebook_entries')
      .delete()
      .eq('id', id)
    if (error) throw new Error(error.message)
    await fetch()
  }

  return { entries, loading, error, create, update, remove, refetch: fetch }
}
