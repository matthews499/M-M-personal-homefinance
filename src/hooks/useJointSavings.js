import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { calcSavingsMonthlyRequired } from '../utils/calculations'
import { broadcast } from '../utils/broadcast'

export function useJointSavings() {
  const [pots,         setPots]         = useState([])
  const [transactions, setTransactions] = useState([])   // replaces "deposits"
  const [loading, setLoading]           = useState(true)
  const [error,   setError]             = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const [potsRes, txRes] = await Promise.all([
      supabase.from('joint_savings_pots').select('*').order('name'),
      supabase.from('joint_savings_deposits').select('*').order('transaction_date', { ascending: false }),
    ])
    if (potsRes.error) setError(potsRes.error.message)
    if (txRes.error)   setError(txRes.error.message)
    setPots(potsRes.data ?? [])
    setTransactions(txRes.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  function transactionsForPot(potId) {
    return transactions.filter(t => t.pot_id === potId)
  }
  // backward-compat alias
  const depositsForPot = transactionsForPot

  // Creating a pot also inserts a matching joint_fixed_outgoing
  async function createPot(fields) {
    const { data: pot, error: potErr } = await supabase
      .from('joint_savings_pots')
      .insert(fields)
      .select()
      .single()
    if (potErr) throw new Error(potErr.message)

    const monthly = calcSavingsMonthlyRequired(pot, [])

    const { data: outgoing, error: fixedErr } = await supabase
      .from('joint_fixed_outgoings')
      .insert({
        name: `Savings – ${pot.name}`,
        amount: monthly,
        day_of_month: 1,
        is_savings_contribution: true,
        savings_pot_id: pot.id,
      })
      .select()
      .single()
    if (fixedErr) throw new Error(fixedErr.message)

    await supabase
      .from('joint_savings_pots')
      .update({ fixed_outgoing_id: outgoing.id })
      .eq('id', pot.id)

    await fetch()
    broadcast('joint-fixed')
  }

  async function updatePot(id, fields) {
    const { error } = await supabase
      .from('joint_savings_pots')
      .update(fields)
      .eq('id', id)
    if (error) throw new Error(error.message)

    const pot = pots.find(p => p.id === id)
    if (pot?.fixed_outgoing_id) {
      const updatedPot = { ...pot, ...fields }
      const potTxns = transactionsForPot(id)
      const monthly = calcSavingsMonthlyRequired(updatedPot, potTxns)
      await supabase
        .from('joint_fixed_outgoings')
        .update({ amount: monthly })
        .eq('id', pot.fixed_outgoing_id)
      broadcast('joint-fixed')
    }

    await fetch()
  }

  async function removePot(id) {
    const pot = pots.find(p => p.id === id)

    const { error } = await supabase
      .from('joint_savings_pots')
      .delete()
      .eq('id', id)
    if (error) throw new Error(error.message)

    if (pot?.fixed_outgoing_id) {
      await supabase
        .from('joint_fixed_outgoings')
        .delete()
        .eq('id', pot.fixed_outgoing_id)
      broadcast('joint-fixed')
    }

    await fetch()
  }

  // Add a deposit or withdrawal
  async function addTransaction(potId, { type, amount, transaction_date, note }) {
    const { error } = await supabase
      .from('joint_savings_deposits')
      .insert({ pot_id: potId, type, amount, transaction_date, note })
    if (error) throw new Error(error.message)
    await fetch()
  }

  // Legacy shim used by old DepositModal calls (amount, month)
  async function addDeposit(potId, amount, month) {
    return addTransaction(potId, {
      type: 'deposit',
      amount,
      transaction_date: month,
      note: '',
    })
  }

  async function removeTransaction(id) {
    const { error } = await supabase
      .from('joint_savings_deposits')
      .delete()
      .eq('id', id)
    if (error) throw new Error(error.message)
    await fetch()
  }

  return {
    pots,
    transactions,
    deposits: transactions, // backward compat
    transactionsForPot,
    depositsForPot,
    loading,
    error,
    refetch: fetch,
    createPot,
    updatePot,
    removePot,
    addTransaction,
    addDeposit,
    removeTransaction,
  }
}
