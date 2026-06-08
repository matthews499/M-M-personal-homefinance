import { supabase } from '../lib/supabase'
import { createNotification } from './createNotification'

const MATTHEW_UUID = 'c722d728-5abe-41fe-9965-3f5d5c69a891'
const MADDY_UUID   = '45b7ef92-2b47-47a8-ae2b-f7348271b62c'

const THRESHOLDS = [
  { pct: 50,  type: 'joint_budget_50',  label: '50%'  },
  { pct: 80,  type: 'joint_budget_80',  label: '80%'  },
  { pct: 100, type: 'joint_budget_100', label: '100%' },
]

/**
 * Checks whether the joint variable budget has crossed 50 / 80 / 100%
 * for the period.  Creates a bell notification and sends an email for
 * each newly-crossed threshold, for BOTH users.
 *
 * Safe to call on every render — dedup_key prevents duplicate rows.
 *
 * @param {{ period: string, totalBudget: number, totalSpent: number }} params
 */
export async function checkJointBudgetAlerts({ period, totalBudget, totalSpent }) {
  if (!period || totalBudget <= 0) return

  const spentPct = (totalSpent / totalBudget) * 100

  for (const { pct, type, label } of THRESHOLDS) {
    if (spentPct < pct) continue

    for (const userId of [MATTHEW_UUID, MADDY_UUID]) {
      const dedupKey = `${type}:${period}:${userId}`

      // Fast check — skip if notification already sent
      const { data: existing } = await supabase
        .from('app_notifications')
        .select('id')
        .eq('dedup_key', dedupKey)
        .maybeSingle()

      if (existing) continue

      const title = `Joint budget at ${label}`
      const body  = `Joint variable spending has reached ${label} of the combined monthly budget.`

      await createNotification({ userId, type, title, body, dedupKey })
    }

    // Email both users via Resend (fire-and-forget)
    supabase.functions.invoke('send-budget-alert', {
      body: {
        type:         'joint',
        categoryName: 'Combined joint variable budget',
        amountSpent:  totalSpent,
        budget:       totalBudget,
        month:        period,
        threshold:    label,
      },
    }).catch(() => {})
  }
}
