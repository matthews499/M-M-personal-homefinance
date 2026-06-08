import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export function usePersonalSavings() {
  const { session } = useAuth()
  const userId = session?.user?.id

  const [pots,         setPots]         = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading]           = useState(true)
  const [error,   setError]             = useState(null)

  const fetch = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const [potsRes, txRes] = await Promise.all([
        supabase.from('personal_savings_pots').select('*').eq('user_id', userId).order('name'),
        supabase.from('personal_savings_deposits').select('*').eq('user_id', userId)
          .order('transaction_date', { ascending: false }),
      ])
      if (potsRes.error) setError(potsRes.error.message)
      if (txRes.error)   setError(txRes.error.message)
      setPots(potsRes.data ?? [])
      setTransactions(txRes.data ?? [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { fetch() }, [fetch])

  function transactionsForPot(potId) {
    return transactions.filter(t => t.pot_id === potId)
  }
  const depositsForPot = transactionsForPot

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

  async function addTransaction(potId, { type, amount, transaction_date, note }) {
    // BUG FIX: derive month (first day of the transaction month) — column is NOT NULL
    const month = transaction_date.slice(0, 7) + '-01'
    const { error } = await supabase
      .from('personal_savings_deposits')
      .insert({ pot_id: potId, user_id: userId, type, amount, transaction_date, note, month })
    if (error) throw new Error(error.message)
    await fetch()
  }

  // Legacy shim
  async function addDeposit(potId, amount, transactionDate) {
    return addTransaction(potId, { type: 'deposit', amount, transaction_date: transactionDate, note: '' })
  }

  async function removeTransaction(id) {
    const { error } = await supabase
      .from('personal_savings_deposits')
      .delete()
      .eq('id', id)
    if (error) throw new Error(error.message)
    await fetch()
  }

  return {
    pots, transactions, deposits: transactions,
    transactionsForPot, depositsForPot,
    loading, error, refetch: fetch,
    createPot, updatePot, removePot,
    addTransaction, addDeposit, removeTransaction,
  }
}
