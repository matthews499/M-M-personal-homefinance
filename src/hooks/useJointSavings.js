import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { calcSavingsMonthlyRequired } from '../utils/calculations'
import { broadcast, listenFor } from '../utils/broadcast'

const KEY = 'joint-savings'

const MATTHEW_UUID = 'c722d728-5abe-41fe-9965-3f5d5c69a891'
const MADDY_UUID   = '45b7ef92-2b47-47a8-ae2b-f7348271b62c'

export function useJointSavings() {
  const [pots,         setPots]         = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading]           = useState(true)
  const [error,   setError]             = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const [potsRes, txRes] = await Promise.all([
      supabase.from('joint_savings_pots').select('*').order('name'),
      supabase
        .from('joint_savings_deposits')
        .select('*')
        .order('transaction_date', { ascending: false }),
    ])
    if (potsRes.error) setError(potsRes.error.message)
    if (txRes.error)   setError(txRes.error.message)
    setPots(potsRes.data ?? [])
    setTransactions(txRes.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch()
    return listenFor(KEY, fetch)
  }, [fetch])

  function transactionsForPot(potId) {
    return transactions.filter(t => t.pot_id === potId)
  }
  const depositsForPot = transactionsForPot // backward-compat alias

  /**
   * Create a new savings pot.
   *
   * Targeted mode: also creates a joint_fixed_outgoing for the monthly contribution.
   * Open mode:     pot only — no fixed outgoing, no monthly commitment, no target.
   */
  async function createPot(fields) {
    const mode = fields.mode ?? 'targeted'

    const { data: pot, error: potErr } = await supabase
      .from('joint_savings_pots')
      .insert({ ...fields, mode })
      .select()
      .single()
    if (potErr) throw new Error(potErr.message)

    if (mode === 'targeted') {
      // Create the corresponding fixed outgoing so monthly contribution
      // is deducted from the joint budget before the disposable split.
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

      broadcast('joint-fixed')
    }

    await fetch()
    broadcast(KEY)
  }

  /**
   * Update a pot. Only targeted pots have a fixed outgoing to sync.
   */
  async function updatePot(id, fields) {
    const { error } = await supabase
      .from('joint_savings_pots')
      .update(fields)
      .eq('id', id)
    if (error) throw new Error(error.message)

    const pot = pots.find(p => p.id === id)
    if (pot?.mode !== 'open' && pot?.fixed_outgoing_id) {
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
    broadcast(KEY)
  }

  /**
   * Delete a pot. Targeted pots also remove their fixed outgoing.
   */
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
    broadcast(KEY)
  }

  /**
   * Add a deposit or withdrawal to a pot.
   *
   * For open-mode pots: matthewShare and maddyShare are required.
   *   deposit  → deducts from each person's personal disposable (via personal_misc_expenses)
   *   withdrawal → credits back to each person's disposable (negative personal_misc_expenses)
   *
   * For targeted-mode pots: matthewShare / maddyShare are ignored.
   *   The fixed outgoing already handles the monthly disposable deduction.
   *   Withdrawals just reduce the pot balance with no disposable impact.
   *
   * @param {string} potId
   * @param {{ type: 'deposit'|'withdrawal', amount: number, transaction_date: string,
   *           note: string, matthewShare?: number, maddyShare?: number }} params
   */
  async function addTransaction(potId, { type, amount, transaction_date, note, matthewShare, maddyShare }) {
    const pot = pots.find(p => p.id === potId)

    const { error } = await supabase
      .from('joint_savings_deposits')
      .insert({
        pot_id:           potId,
        type,
        amount,
        transaction_date,
        note:             note ?? '',
        matthew_share:    matthewShare ?? null,
        maddy_share:      maddyShare   ?? null,
      })
    if (error) throw new Error(error.message)

    // Open mode: affect personal disposables immediately
    if (pot?.mode === 'open' && matthewShare != null && maddyShare != null) {
      // For a deposit:    positive → reduces disposable (deduction)
      // For a withdrawal: negative → increases disposable (credit back)
      const sign  = type === 'withdrawal' ? -1 : 1
      const label = type === 'withdrawal'
        ? `Savings withdrawal — ${pot.name}`
        : `Savings deposit — ${pot.name}`

      const { error: miscErr } = await supabase
        .from('personal_misc_expenses')
        .insert([
          { user_id: MATTHEW_UUID, name: label, amount: parseFloat((sign * matthewShare).toFixed(2)), expense_date: transaction_date },
          { user_id: MADDY_UUID,   name: label, amount: parseFloat((sign * maddyShare).toFixed(2)),   expense_date: transaction_date },
        ])
      if (miscErr) console.warn('[useJointSavings] personal_misc insert failed:', miscErr.message)

      broadcast('personal-misc')
    }

    await fetch()
    broadcast(KEY)
  }

  // Legacy shim — kept for any callers that still use the old signature
  async function addDeposit(potId, amount, month) {
    return addTransaction(potId, {
      type:             'deposit',
      amount,
      transaction_date: month,
      note:             '',
    })
  }

  async function removeTransaction(id) {
    const tx  = transactions.find(t => t.id === id)
    const pot = pots.find(p => p.id === tx?.pot_id)

    const { error } = await supabase
      .from('joint_savings_deposits')
      .delete()
      .eq('id', id)
    if (error) throw new Error(error.message)

    // Bug 1: cascade — delete the linked personal_misc_expenses rows that were
    // pre-inserted when this open-mode deposit / withdrawal was logged.
    // Match on name + transaction_date for both users (no FK; specific enough for 2-person app).
    if (
      pot?.mode === 'open' &&
      tx?.transaction_date &&
      (tx.matthew_share != null || tx.maddy_share != null)
    ) {
      const label = tx.type === 'withdrawal'
        ? `Savings withdrawal — ${pot.name}`
        : `Savings deposit — ${pot.name}`
      await supabase
        .from('personal_misc_expenses')
        .delete()
        .eq('name', label)
        .eq('expense_date', tx.transaction_date)
        .in('user_id', [MATTHEW_UUID, MADDY_UUID])
      broadcast('personal-misc')
    }

    await fetch()
    broadcast(KEY)
  }

  return {
    pots,
    transactions,
    deposits: transactions,       // backward compat
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
