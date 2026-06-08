import { supabase } from '../lib/supabase'
import { createNotification } from './createNotification'

// Only run once per browser session per user
const checked = new Set()

/**
 * Creates a bell notification for each of the user's incomplete tasks
 * that are due tomorrow.
 *
 * Due date for every task is the 25th of its period month.
 * "Due tomorrow" = today is the 24th of that month.
 */
export async function checkTaskDueAlerts(userId) {
  if (!userId) return
  const key = `taskdue:${userId}`
  if (checked.has(key)) return
  checked.add(key)

  try {
    // Is tomorrow the 25th?  If not, no tasks are due tomorrow.
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().slice(0, 10) // 'YYYY-MM-DD'
    if (!tomorrowStr.endsWith('-25')) return

    // The period whose end date is tomorrow
    const period = tomorrowStr.slice(0, 7) // 'YYYY-MM'

    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title')
      .eq('user_id', userId)
      .eq('period', period)
      .eq('completed', false)

    if (!tasks?.length) return

    for (const task of tasks) {
      await createNotification({
        userId,
        type:     'task_due_soon',
        title:    'Task due tomorrow',
        body:     task.title,
        dedupKey: `task_due:${task.id}`,
      })
    }
  } catch (e) {
    console.warn('[checkTaskDueAlerts] failed:', e.message)
  }
}
