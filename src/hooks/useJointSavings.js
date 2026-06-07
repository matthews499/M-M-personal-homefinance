import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { calcSavingsMonthlyRequired } from '../utils/calculations'
import { broadcast } from '../utils/broadcast'

export function useJointSavings() {
  const [pots, setPots]         = useState([])
  const [deposits, setDeposits] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const [potsRes, depositsRes] = await Promise.all([
      supabase.from('joint_savings_pots').select('*').order('name'),
      supabase.from('joint_savings_deposits').select('*').order('month'),
    ])
    if (potsRes.error)    setError(potsRes.error.message)
    if (depositsRes.error) setError(depositsRes.error.message)
    setPots(potsRes.data ?? [])
    setDeposits(depositsRes.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  function depositsForPot(potId) {
    return deposits.filter(d => d.pot_id === potId)
  }

  // Creating a pot also inserts a matching joint_fixed_outgoing
  async function createPot(fields) {
    // 1. Insert the pot
    const { data: pot, error: potErr } = await supabase
      .from('joint_savings_pots')
      .insert(fields)
      .select()
      .single()
    if (potErr) throw new Error(potErr.message)

    // 2. Calculate the required monthly contribution
    const monthly = calcSavingsMonthlyRequired(pot, [])

    // 3. Create the fixed outgoing entry
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

    // 4. Link the fixed outgoing back to the pot
    await supabase
      .from('joint_savings_pots')
      .update({ fixed_outgoing_id: outgoing.id })
      .eq('id', pot.id)

    await fetch()
    broadcast('joint-fixed') // new pot created a joint_fixed_outgoing
  }

  // Updating target or date recalculates the linked fixed outgoing
  async function updatePot(id, fields) {
    const { error } = await supabase
      .from('joint_savings_pots')
      .update(fields)
      .eq('id', id)
    if (error) throw new Error(error.message)

    // Recalculate the linked fixed outgoing amount
    const pot = pots.find(p => p.id === id)
    if (pot?.fixed_outgoing_id) {
      const updatedPot = { ...pot, ...fields }
      const potDeposits = depositsForPot(id)
      const monthly = calcSavingsMonthlyRequired(updatedPot, potDeposits)
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

    // Remove pot (cascades deposits); also remove the linked fixed outgoing
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

  async function addDeposit(potId, amount, month) {
    const { error } = await supabase
      .from('joint_savings_deposits')
      .insert({ pot_id: potId, amount, month })
    if (error) throw new Error(error.message)
    await fetch()
  }

  async function removeDeposit(id) {
    const { error } = await supabase
      .from('joint_savings_deposits')
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
