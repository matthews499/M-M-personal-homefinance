import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { monthParam } from '../utils/dates'
import { calcBudgetProgress } from '../utils/calculations'
import { broadcast, listenFor } from '../utils/broadcast'

const KEY = 'joint-variable'

export function useJointVariable(month = monthParam()) {
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
    const [year, mon] = month.slice(0, 7).split('-').map(Number)
    const nextYear  = mon === 12 ? year + 1 : year
    const nextMonth = mon === 12 ? 1 : mon + 1
    const to = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

    const { data, error } = await supabase
      .from('joint_transactions')
      .select('*')
      .gte('transaction_date', month)
      .lt('transaction_date', to)
      .order('transaction_date', { ascending: false })
    if (error) throw new Error(error.message)
    return data
  }, [month])

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
      const { pct, spent, budget } = calcBudgetProgress(cat, catTxns, month)
      if (pct >= 80 && cat.notification_sent_month !== month) {
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
      .update({ notification_sent_month: month })
      .eq('id', category.id)

    await supabase.functions.invoke('send-budget-alert', {
      body: { type: 'joint', categoryId: category.id, categoryName: category.name, amountSpent, budget, month },
    }).catch(() => {})

    await fetch()
  }

  return {
    categories, transactions, loading, error, refetch: fetch,
    createCategory, updateCategory, removeCategory,
    addTransaction, updateTransaction, removeTransaction,
  }
}
