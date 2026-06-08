import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { calcBudgetProgress } from '../utils/calculations'
import { broadcast, listenFor } from '../utils/broadcast'
import { getCurrentPeriod, getPeriodDateRange } from '../utils/payCycle'

const KEY = 'personal-variable'

export function usePersonalVariable(period = getCurrentPeriod()) {
  const { session } = useAuth()
  const userId = session?.user?.id
  const { start, end } = getPeriodDateRange(period)

  const [categories, setCategories]     = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)

  const fetchCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from('personal_variable_categories')
      .select('*')
      .eq('user_id', userId)
      .order('name')
    if (error) throw new Error(error.message)
    return data
  }, [userId])

  const fetchTransactions = useCallback(async () => {
    const { data, error } = await supabase
      .from('personal_transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('transaction_date', start)
      .lte('transaction_date', end)
      .order('transaction_date', { ascending: false })
    if (error) throw new Error(error.message)
    return data
  }, [userId, start, end])

  const fetch = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const [cats, txns] = await Promise.all([fetchCategories(), fetchTransactions()])
      setCategories(cats)
      setTransactions(txns)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }, [userId, fetchCategories, fetchTransactions])

  useEffect(() => {
    fetch()
    return listenFor(KEY, fetch)
  }, [fetch])

  // ── Categories ──────────────────────────────────────────────

  async function createCategory(fields) {
    const { error } = await supabase
      .from('personal_variable_categories')
      .insert({ ...fields, user_id: userId })
    if (error) throw new Error(error.message)
    await fetch()
    broadcast(KEY)
  }

  async function updateCategory(id, fields) {
    const { error } = await supabase
      .from('personal_variable_categories')
      .update(fields)
      .eq('id', id)
    if (error) throw new Error(error.message)
    await fetch()
    broadcast(KEY)
  }

  async function removeCategory(id) {
    const { error } = await supabase
      .from('personal_variable_categories')
      .delete()
      .eq('id', id)
    if (error) throw new Error(error.message)
    await fetch()
    broadcast(KEY)
  }

  // ── Transactions ────────────────────────────────────────────

  async function addTransaction(categoryId, fields) {
    const { error } = await supabase
      .from('personal_transactions')
      .insert({ ...fields, category_id: categoryId, user_id: userId })
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
      .from('personal_transactions')
      .update(fields)
      .eq('id', id)
    if (error) throw new Error(error.message)
    await fetch()
  }

  async function removeTransaction(id) {
    const { error } = await supabase
      .from('personal_transactions')
      .delete()
      .eq('id', id)
    if (error) throw new Error(error.message)
    await fetch()
  }

  async function trigger80PctAlert(category, amountSpent, budget) {
    await supabase
      .from('personal_variable_categories')
      .update({ notification_sent_month: period })
      .eq('id', category.id)

    await supabase.functions.invoke('send-budget-alert', {
      body: { type: 'personal', userId, categoryId: category.id, categoryName: category.name, amountSpent, budget, month: period },
    }).catch(() => {})

    await fetch()
  }

  return {
    categories, transactions, loading, error, refetch: fetch,
    createCategory, updateCategory, removeCategory,
    addTransaction, updateTransaction, removeTransaction,
  }
}
