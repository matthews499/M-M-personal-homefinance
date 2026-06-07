import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export function usePersonalSavings() {
  const { session } = useAuth()
  const userId = session?.user?.id

  const [pots, setPots]         = useState([])
  const [deposits, setDeposits] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  const fetch = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const [potsRes, depositsRes] = await Promise.all([
      supabase.from('personal_savings_pots').select('*').eq('user_id', userId).order('name'),
      supabase.from('personal_savings_deposits').select('*').eq('user_id', userId).order('month'),
    ])
    if (potsRes.error)     setError(potsRes.error.message)
    if (depositsRes.error) setError(depositsRes.error.message)
    setPots(potsRes.data ?? [])
    setDeposits(depositsRes.data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => { fetch() }, [fetch])

  function depositsForPot(potId) {
    return deposits.filter(d => d.pot_id === potId)
  }

  async function createPot(fields) {
    const { error } = await supabase
      .from('personal_savings_pots')
      .insert({ ...fields, user_id: userId })
    if (error) throw new Error(error.message)
    await fetch()
  }

  async function updatePot(id, fields) {
    const { error } = await supabase
      .from('personal_savings_pots')
      .update(fields)
      .eq('id', id)
    if (error) throw new Error(error.message)
    await fetch()
  }

  async function removePot(id) {
    const { error } = await supabase
      .from('personal_savings_pots')
      .delete()
      .eq('id', id)
    if (error) throw new Error(error.message)
    await fetch()
  }

  async function addDeposit(potId, amount, month) {
    const { error } = await supabase
      .from('personal_savings_deposits')
      .insert({ pot_id: potId, user_id: userId, amount, month })
    if (error) throw new Error(error.message)
    await fetch()
  }

  async function removeDeposit(id) {
    const { error } = await supabase
      .from('personal_savings_deposits')
      .delete()
      .eq('id', id)
    if (error) throw new Error(error.message)
    await fetch()
  }

  return {
    pots,
    deposits,
    depositsForPot,
    loading,
    error,
    refetch: fetch,
    createPot,
    updatePot,
    removePot,
    addDeposit,
    removeDeposit,
  }
}
