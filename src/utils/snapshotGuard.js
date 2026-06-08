import { supabase } from '../lib/supabase'
import { getCurrentPeriod, getPrevPeriod } from './payCycle'

// Module-level Set — ensures we only check once per period per session
const checkedKeys = new Set()

/**
 * Called on first activity in a new pay period.
 * Creates a snapshot of the PREVIOUS period if one doesn't exist yet.
 */
export async function ensureSnapshot(userId) {
  if (!userId) return
  const currentPeriod = getCurrentPeriod()
  const key = `${userId}:${currentPeriod}`
  if (checkedKeys.has(key)) return
  checkedKeys.add(key)

  try {
    const prevPeriod = getPrevPeriod(currentPeriod)

    // Already snapshotted?
    const { data: existing } = await supabase
      .from('period_snapshots')
      .select('id')
      .eq('period', prevPeriod)
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) return

    // Gather data from the current profile state (reflects end of prev period)
    const [contribRes, settingsRes] = await Promise.all([
      supabase.rpc('get_joint_contributions'),
      supabase.from('app_settings').select('matthew_split_ratio').single(),
    ])

    const contribs = contribRes.data ?? []
    const settings = settingsRes.data
    if (!contribs.length || !settings) return

    const me = contribs.find(c => c.user_id === userId)
    if (!me) return

    const matthewRatio = Number(settings.matthew_split_ratio)
    const matthewUUID  = 'c722d728-5abe-41fe-9965-3f5d5c69a891'
    const isMatthew    = userId === matthewUUID
    const myRatio      = isMatthew ? matthewRatio : (1 - matthewRatio)

    // Rough disposable: contribution share of total contributions after fixed/var costs
    // (Good enough for historical reference)
    const totalIn = contribs.reduce((s, c) => s + Number(c.contribution), 0)

    const [fixedRes, varRes] = await Promise.all([
      supabase.from('joint_fixed_outgoings').select('amount').neq('is_savings_contribution', true),
      supabase.from('joint_variable_categories').select('monthly_budget'),
    ])
    const fixedTotal = (fixedRes.data ?? []).reduce((s, r) => s + Number(r.amount), 0)
    const varBudget  = (varRes.data  ?? []).reduce((s, r) => s + Number(r.monthly_budget), 0)
    const jointBalance = totalIn - fixedTotal - varBudget
    const disposableIncome = jointBalance * myRatio

    await supabase.from('period_snapshots').upsert({
      period:               prevPeriod,
      user_id:              userId,
      salary:               Number(me.salary),
      personal_fixed_total: Number(me.personal_fixed_total),
      contribution:         Number(me.contribution),
      matthew_ratio:        matthewRatio,
      disposable_income:    disposableIncome,
    }, { onConflict: 'period,user_id' })

  } catch (e) {
    console.warn('[snapshotGuard] failed:', e.message)
  }
}
