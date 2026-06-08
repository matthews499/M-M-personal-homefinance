import { supabase } from '../lib/supabase'
import { getCurrentPeriod } from './payCycle'
import { broadcast } from './broadcast'

// Module-level Set — only run once per period per browser session
const checkedPeriods = new Set()

/**
 * Ensures contribution_reminder tasks exist for both users for the current period.
 * Called on app load from any page that shows the dashboard.
 * Idempotent — the DB unique index prevents duplicates.
 */
export async function ensureContributionTasks() {
  const period = getCurrentPeriod()
  if (checkedPeriods.has(period)) return
  checkedPeriods.add(period)

  try {
    // Check if tasks already exist for this period (either user)
    const { data: existing } = await supabase
      .from('tasks')
      .select('id')
      .eq('type', 'contribution_reminder')
      .eq('period', period)
      .limit(1)

    if (existing?.length) return

    // Fetch both users' contributions to get the correct amounts
    const { data: contribs, error } = await supabase.rpc('get_joint_contributions')
    if (error || !contribs?.length) return

    const tasks = contribs.map(c => ({
      type:    'contribution_reminder',
      user_id: c.user_id,
      // Contribution can be negative if disposable exceeds available — clamp to 0
      title:   `Transfer £${Math.max(0, Number(c.contribution)).toFixed(2)} into joint this month`,
      amount:  Math.max(0, Number(c.contribution)),
      period,
    }))

    await supabase
      .from('tasks')
      .upsert(tasks, { ignoreDuplicates: true })

    broadcast('tasks')
  } catch (e) {
    console.warn('[taskGuard] failed:', e.message)
  }
}
