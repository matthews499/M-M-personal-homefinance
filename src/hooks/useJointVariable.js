import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { calcBudgetProgress } from '../utils/calculations'
import { broadcast, listenFor } from '../utils/broadcast'
import { getCurrentPeriod, getPeriodDateRange } from '../utils/payCycle'
import { createExpenseTasks } from '../utils/createExpenseTasks'
import { createNotification } from '../utils/createNotification'

const KEY = 'joint-variable'
const MATTHEW_UUID = 'c722d728-5abe-41fe-9965-3f5d5c69a891'
const MADDY_UUID   = '45b7ef92-2b47-47a8-ae2b-f7348271b62c'

export function useJointVariable(period = getCurrentPeriod()) {
  const { start, end } = getPeriodDateRange(period)

  const [categories, setCategories]     = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)

  const fetchCategories = useCallback(async () => {
    const { data, error } = await supabase.from('joint_variable_categories').select('*').order('name')
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
    const { data, error } = await supabase
      .from('joint_variable_categories').insert(fields).select().single()
    if (error) throw new Error(error.message)
    await fetch()
    broadcast(KEY)
    createExpenseTasks({
      expenseId: data.id, expenseType: 'joint_variable',
      expenseName: fields.name, expenseAmount: Number(fields.monthly_budget),
    }).catch(e => console.warn('[useJointVariable] task creation failed:', e.message))
  }

  async function updateCategory(id, fields) {
    const { error } = await supabase.from('joint_variable_categories').update(fields).eq('id', id)
    if (error) throw new Error(error.message)
    await fetch()
    broadcast(KEY)
  }

  async function removeCategory(id) {
    const { error } = await supabase.from('joint_variable_categories').delete().eq('id', id)
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

    // Per-category 80% check
    const cat = cats.find(c => c.id === categoryId)
    if (cat) {
      const catTxns = txns.filter(tx => tx.category_id === cat.id)
      const { pct, spent, budget } = calcBudgetProgress(cat, catTxns, start)
      if (pct >= 80 && cat.notification_sent_month !== period) {
        await triggerCategory80PctAlert(cat, spent, budget)
      }
    }

    // Overall variable budget 80% check
    const totalBudget = cats.reduce((s, c) => s + Number(c.monthly_budget), 0)
    const totalSpent  = txns.reduce((s, tx) => s + Number(tx.amount), 0)
    if (totalBudget > 0 && totalSpent / totalBudget >= 0.8) {
      await triggerOverall80PctAlert(totalSpent, totalBudget)
    }

    broadcast(KEY) // Bug 5: keep JointBudgetCard in sync
  }

  async function updateTransaction(id, fields) {
    const { error } = await supabase.from('joint_transactions').update(fields).eq('id', id)
    if (error) throw new Error(error.message)
    await fetch()
    broadcast(KEY)
  }

  async function removeTransaction(id) {
    const { error } = await supabase.from('joint_transactions').delete().eq('id', id)
    if (error) throw new Error(error.message)
    await fetch()
    broadcast(KEY)
  }

  // ── Per-category 80% alert ───────────────────────────────────

  async function triggerCategory80PctAlert(category, amountSpent, budget) {
    await supabase.from('joint_variable_categories')
      .update({ notification_sent_month: period }).eq('id', category.id)

    // Bell notifications for both users
    for (const uid of [MATTHEW_UUID, MADDY_UUID]) {
      await createNotification({
        userId:   uid,
        type:     'variable_budget_80',
        title:    `${category.name} budget at 80%`,
        body:     `Joint spending on ${category.name} has reached 80% of the monthly budget.`,
        dedupKey: `catbudget_80:${category.id}:${period}:${uid}`,
      })
    }

    // Email both users
    supabase.functions.invoke('send-budget-alert', {
      body: { type: 'joint', categoryName: category.name, amountSpent, budget, month: period },
    }).catch(() => {})

    await fetch()
  }

  // ── Overall variable budget 80% alert ───────────────────────

  async function triggerOverall80PctAlert(totalSpent, totalBudget) {
    for (const uid of [MATTHEW_UUID, MADDY_UUID]) {
      await createNotification({
        userId:   uid,
        type:     'variable_budget_80',
        title:    'Total variable budget at 80%',
        body:     'Joint variable spending has reached 80% of the combined monthly budget.',
        dedupKey: `varbudget_80:${period}:${uid}`,
      })
    }

    supabase.functions.invoke('send-budget-alert', {
      body: { type: 'joint', categoryName: 'Total variable budget', amountSpent: totalSpent, budget: totalBudget, month: period },
    }).catch(() => {})
  }

  return {
    categories, transactions, loading, error, refetch: fetch,
    createCategory, updateCategory, removeCategory,
    addTransaction, updateTransaction, removeTransaction,
  }
}
