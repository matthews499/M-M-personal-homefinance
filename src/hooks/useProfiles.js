import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useProfiles() {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('name')
    if (error) setError(error.message)
    else setProfiles(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  async function updateProfile(id, updates) {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
    if (error) throw new Error(error.message)
    await fetch()
  }

  return { profiles, loading, error, refetch: fetch, updateProfile }
}
