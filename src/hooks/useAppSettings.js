import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { broadcast } from '../utils/broadcast'

export function useAppSettings() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .single()
    if (error) setError(error.message)
    else setSettings(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  async function updateSplitRatio(matthewRatio) {
    const { error } = await supabase
      .from('app_settings')
      .update({ matthew_split_ratio: matthewRatio })
      .eq('id', 1)
    if (error) throw new Error(error.message)
    await fetch()
    // Notify all dashboard instances (including the one on this page) to refetch
    broadcast('app-settings')
  }

  return { settings, loading, error, refetch: fetch, updateSplitRatio }
}
