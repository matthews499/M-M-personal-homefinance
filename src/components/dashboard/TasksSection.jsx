import { useEffect } from 'react'
import { useTasks } from '../../hooks/useTasks'
import { useAuth } from '../../lib/AuthContext'
import { getCurrentPeriod } from '../../utils/payCycle'
import { checkTaskDueAlerts } from '../../utils/checkTaskDueAlerts'
import { format, parseISO } from 'date-fns'

const fmt = n => Number(n).toFixed(2)

// Hardcoded names so the label works even if the profile join fails RLS
const USER_NAMES = {
  'c722d728-5abe-41fe-9965-3f5d5c69a891': 'Matthew',
  '45b7ef92-2b47-47a8-ae2b-f7348271b62c': 'Maddy',
}

function fmtDueDate(period) {
  try {
    return format(parseISO(`${period}-25`), 'd MMM')
  } catch {
    return `${period}-25`
  }
}

export function TasksSection() {
  const { session } = useAuth()
  const userId = session?.user?.id
  const { activeTasks, completeTask, loading } = useTasks()
  const period = getCurrentPeriod()
  const tasks  = activeTasks(period)

  useEffect(() => {
    checkTaskDueAlerts(userId)
  }, [userId])

  if (loading) return null
  if (!tasks.length) return null

  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)' }}>
      <div className="flex items-center gap-2 mb-3">
        {/* clock icon */}
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-accent)' }}>
          <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 6v6l4 2" />
        </svg>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          To do
        </h2>
        <span
          className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: 'var(--color-accent)', color: '#fff' }}
        >
          {tasks.length}
        </span>
      </div>

      <ul className="space-y-2">
        {tasks.map(task => {
          const isOwn    = task.user_id === userId
          const userName = USER_NAMES[task.user_id] ?? task.user?.name ?? 'Partner'
          const dueDate  = fmtDueDate(task.period)

          return (
            <li
              key={task.id}
              className="flex items-start gap-3 rounded-xl px-3 py-2.5"
              style={{ background: 'var(--color-surface)' }}
            >
              {/* Tick button — only for own tasks */}
              {isOwn ? (
                <button
                  onClick={() => completeTask(task)}
                  className="mt-0.5 flex-shrink-0 transition-opacity hover:opacity-70 active:scale-95"
                  title="Mark complete"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-text-secondary)' }}>
                    <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                  </svg>
                </button>
              ) : (
                <svg className="mt-0.5 w-5 h-5 flex-shrink-0 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-text-secondary)' }}>
                  <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                </svg>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm leading-snug" style={{ color: 'var(--color-text-primary)' }}>
                  {task.title}
                </p>
                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                  {!isOwn && (
                    <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {userName}'s task
                    </p>
                  )}
                  <p className="text-xs" style={{ color: '#9898a8' }}>
                    Due {dueDate}
                  </p>
                  {task.period < period && (
                    <p className="text-xs" style={{ color: '#f59e0b' }}>
                      Carried over from {task.period}
                    </p>
                  )}
                </div>
              </div>

              {task.amount > 0 && (
                <span
                  className="flex-shrink-0 text-sm font-semibold tabular-nums"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  £{fmt(task.amount)}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
