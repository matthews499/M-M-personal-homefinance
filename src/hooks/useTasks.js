import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { broadcast, listenFor } from '../utils/broadcast'
import { getCurrentPeriod } from '../utils/payCycle'

const KEY = 'tasks'

export function useTasks() {
  const { session } = useAuth()
  const userId = session?.user?.id

  const [tasks,   setTasks]   = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    // Fetch all tasks (both users — both can see both) ordered by creation
    const { data } = await supabase
      .from('tasks')
      .select('*, user:profiles!user_id(name)')
      .order('created_at', { ascending: true })
    setTasks(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetch()
    return listenFor(KEY, fetch)
  }, [fetch])

  /**
   * Returns all tasks that should be shown for the current period:
   * - Incomplete tasks from the current period or any earlier period (carry-over)
   * Tasks are NOT filtered by user so both people's tasks are visible.
   */
  function activeTasks(period = getCurrentPeriod()) {
    return tasks.filter(t => !t.completed && t.period <= period)
  }

  /**
   * Mark a task as complete for the current user.
   * For expense_topup tasks: also inserts a personal_misc_expenses row
   * so the amount deducts from the user's personal disposable.
   */
  async function completeTask(task) {
    if (task.user_id !== userId) return // can only complete your own

    const { error } = await supabase
      .from('tasks')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('id', task.id)
    if (error) throw new Error(error.message)

    // For expense_topup: create the personal misc expense so it shows
    // in the personal account and deducts from disposable
    if (task.type === 'expense_topup') {
      await supabase
        .from('personal_misc_expenses')
        .insert({
          user_id:      userId,
          name:         task.title,
          amount:       task.amount,
          expense_date: new Date().toISOString().slice(0, 10),
        })
      broadcast('personal-misc')
    }

    await fetch()
    broadcast(KEY)
  }

  return {
    tasks,
    loading,
    activeTasks,
    completeTask,
    refetch: fetch,
  }
}
