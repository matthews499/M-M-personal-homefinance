import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { calcBudgetProgress } from '../utils/calculations'
import { broadcast, listenFor } from '../utils/broadcast'
import { getCurrentPeriod, getPeriodDateRange } from '../utils/payCycle'

const KEY = 'joint-variable'

export function useJointVariable(period = getCurrentPeriod()) {
  const { start, end } = getPeriodDateRange(period)

  const [categories, setCategories]     = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)

  const fetchCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from('joint_variable_categories')
      .select('*')
      .order('name')
    if (error) throw new Error(error.message)
    return data
  }, [])

  const fetchTransactions = useCallback(async () => {
    const { data, error } = await supabase
      .from('joint_transactions')
      .select('*')
      .gte('transaction_date', start)
      .lte('transaction_date', end)
      .order('transaction_date', { ascending: false })
    if (error) throw new Error(error.message)
    return data
  }, [start, end])

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const [cats, txns] = await Promise.all([fetchCategories(), fetchTransactions()])
      setCategories(cats)
      setTransactions(txns)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }, [fetchCategories, fetchTransactions])

  useEffect(() => {
    fetch()
    return listenFor(KEY, fetch)
  }, [fetch])

  // ── Categories ──────────────────────────────────────────────

  async function createCategory(fields) {
    const { error } = await supabase
      .from('joint_variable_categories')
      .insert(fields)
      .select()
    if (error) throw new Error(error.message)
    await fetch()
    broadcast(KEY)
  }

  async function updateCategory(id, fields) {
    const { error } = await supabase
      .from('joint_variable_categories')
      .update(fields)
      .eq('id', id)
    if (error) throw new Error(error.message)
    await fetch()
    broadcast(KEY)
  }

  async function removeCategory(id) {
    const { error } = await supabase
      .from('joint_variable_categories')
      .delete()
      .eq('id', id)
    if (error) throw new Error(error.message)
    await fetch()
    broadcast(KEY)
  }

  // ── Transactions ────────────────────────────────────────────

  async function addTransaction(categoryId, fields, userId) {
    const { error } = await supabase
      .from('joint_transactions')
      .insert({ ...fields, category_id: categoryId, created_by: userId })
    if (error) throw new Error(error.message)

    const [cats, txns] = await Promise.all([fetchCategories(), fetchTransactions()])
    setCategories(cats)
    setTransactions(txns)

    const cat = cats.find(c => c.id === categoryId)
    if (cat) {
      const catTxns = txns.filter(tx => tx.category_id === cat.id)
      const { pct, spent, budget } = calcBudgetProgress(cat, catTxns, start)
      if (pct >= 80 && cat.notification_sent_month !== period) {
        await trigger80PctAlert(cat, spent, budget)
      }
    }
  }

  async function updateTransaction(id, fields) {
    const { error } = await supabase
      .from('joint_transactions')
      .update(fields)
      .eq('id', id)
    if (error) throw new Error(error.message)
    await fetch()
  }

  async function removeTransaction(id) {
    const { error } = await supabase
      .from('joint_transactions')
      .delete()
      .eq('id', id)
    if (error) throw new Error(error.message)
    await fetch()
  }

  // ── 80% alert ───────────────────────────────────────────────

  async function trigger80PctAlert(category, amountSpent, budget) {
    await supabase
      .from('joint_variable_categories')
      .update({ notification_sent_month: period })
      .eq('id', category.id)

    await supabase.functions.invoke('send-budget-alert', {
      body: { type: 'joint', categoryId: category.id, categoryName: category.name, amountSpent, budget, month: period },
    }).catch(() => {})

    await fetch()
  }

  return {
    categories, transactions, loading, error, refetch: fetch,
    createCategory, updateCategory, removeCategory,
    addTransaction, updateTransaction, removeTransaction,
  }
}
