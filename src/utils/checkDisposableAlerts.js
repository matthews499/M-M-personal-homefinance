import { supabase } from '../lib/supabase'
import { createNotification } from './createNotification'

// Thresholds checked in ascending order — all that are crossed get a notification
const THRESHOLDS = [
  { pct: 50,  type: 'disposable_50',  label: '50%'  },
  { pct: 80,  type: 'disposable_80',  label: '80%'  },
  { pct: 100, type: 'disposable_100', label: '100%' },
]

/**
 * Checks whether the user has crossed 50 / 80 / 100% of their personal
 * disposable spending for the period.  Creates a bell notification and sends
 * an email for each newly-crossed threshold.
 *
 * Safe to call on every render — dedup_key prevents duplicate rows.
 *
 * @param {{ userId: string, period: string, disposable: number, spent: number }} params
 */
export async function checkDisposableAlerts({ userId, period, disposable, spent }) {
  if (!userId || !period || disposable <= 0) return

  const spentPct = (spent / disposable) * 100

  for (const { pct, type, label } of THRESHOLDS) {
    if (spentPct < pct) continue

    const dedupKey = `${type}:${userId}:${period}`

    // Fast check: does this notification already exist?
    const { data: existing } = await supabase
      .from('app_notifications')
      .select('id')
      .eq('dedup_key', dedupKey)
      .maybeSingle()

    if (existing) continue

    const title = `${label} of personal disposable spent`
    const body  = `You've used ${label} of your personal disposable income this period.`

    await createNotification({ userId, type, title, body, dedupKey })

    // Email via Resend (fire-and-forget)
    supabase.functions.invoke('send-budget-alert', {
      body: {
        type:         'disposable',
        userId,
        categoryName: 'Personal disposable income',
        amountSpent:  spent,
        budget:       disposable,
        month:        period,
        threshold:    label,
      },
    }).catch(() => {})
  }
}
