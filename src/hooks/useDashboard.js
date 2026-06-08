import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAppSettings } from './useAppSettings'
import { useJointFixed } from './useJointFixed'
import { useJointVariable } from './useJointVariable'
import { useJointMisc } from './useJointMisc'
import { useAuth } from '../lib/AuthContext'
import { sumAmount } from '../utils/calculations'
import { getCurrentPeriod, getPeriodDateRange } from '../utils/payCycle'
import { listenFor } from '../utils/broadcast'

const MATTHEW_UUID = 'c722d728-5abe-41fe-9965-3f5d5c69a891'

export function useDashboard() {
  const { profile: currentProfile, session } = useAuth()
  const { settings, loading: sLoad, updateSplitRatio } = useAppSettings()
  const { items: jointFixed,       loading: jfLoad }   = useJointFixed()
  const { categories: jointCategories, loading: jvLoad } = useJointVariable()
  const { items: jointMiscItems,   loading: miscLoad }  = useJointMisc()

  const [contribs,          setContribs]          = useState([])
  const [personalSummaries, setPersonalSummaries] = useState([])
  const [cLoading,  setCLoading]  = useState(true)
  const [psLoading, setPsLoading] = useState(true)
  const [cError,    setCError]    = useState(null)

  const currentPeriod = getCurrentPeriod()
  const { start: periodStart, end: periodEnd } = getPeriodDateRange(currentPeriod)

  // ── Joint contributions (correct model) ─────────────────────
  const fetchContribs = useCallback(async () => {
    setCLoading(true)
    const { data, error } = await supabase.rpc('get_joint_contributions')
    if (error) setCError(error.message)
    else setContribs(data ?? [])
    setCLoading(false)
  }, [])

  // ── Personal summaries for both users ───────────────────────
  const fetchPersonalSummaries = useCallback(async () => {
    setPsLoading(true)
    const { data } = await supabase.rpc('get_personal_summaries', { p_period: currentPeriod })
    setPersonalSummaries(data ?? [])
    setPsLoading(false)
  }, [currentPeriod])

  useEffect(() => { fetchContribs() }, [fetchContribs])
  useEffect(() => { fetchPersonalSummaries() }, [fetchPersonalSummaries])

  // Re-fetch contributions when split ratio changes (broadcast from useAppSettings)
  useEffect(() => {
    return listenFor('app-settings', fetchContribs)
  }, [fetchContribs])

  // Re-fetch personal summaries when personal spending changes
  useEffect(() => {
    const unsubMisc = listenFor('personal-misc', fetchPersonalSummaries)
    const unsubVar  = listenFor('personal-variable', fetchPersonalSummaries)
    const unsubTask = listenFor('tasks', fetchPersonalSummaries)
    return () => { unsubMisc(); unsubVar(); unsubTask() }
  }, [fetchPersonalSummaries])

  async function updateProfile(id, updates) {
    const { error } = await supabase.from('profiles').update(updates).eq('id', id)
    if (error) throw new Error(error.message)
    await fetchContribs()
  }

  const loading = sLoad || jfLoad || jvLoad || miscLoad || cLoading
  // psLoading is separate — personal summaries load after main data, non-blocking

  const derived = useMemo(() => {
    if (loading || !contribs.length || !settings || !currentProfile) return null

    // Identify users by UUID — robust against name changes
    const matthew = contribs.find(c => c.user_id === MATTHEW_UUID)
    const maddy   = contribs.find(c => c.user_id !== MATTHEW_UUID)
    if (!matthew || !maddy) return null

    const isMatthew = currentProfile.id === MATTHEW_UUID
    const me        = isMatthew ? matthew : maddy
    const partner   = isMatthew ? maddy   : matthew

    // ── Joint cost figures (active costs for current period) ──
    const fixedTotal = sumAmount(
      jointFixed.filter(i =>
        (!i.active_until || i.active_until >= currentPeriod) &&
        (!i.active_from  || i.active_from  <= currentPeriod)
      )
    )
    const varBudget = jointCategories.reduce((acc, c) => acc + Number(c.monthly_budget), 0)
    const miscThisMonth = sumAmount(
      jointMiscItems.filter(i =>
        i.expense_date >= periodStart && i.expense_date <= periodEnd &&
        i.deduction_type !== 'variable'  // already counted in var spending — avoid double-counting
      )
    )

    // ── Core figures from updated RPC ─────────────────────────
    const matthewAvailable   = Number(matthew.available)
    const maddyAvailable     = Number(maddy.available)
    const totalAvailable     = matthewAvailable + maddyAvailable

    const matthewDisposable  = Number(matthew.disposable)
    const maddyDisposable    = Number(maddy.disposable)
    const totalDisposable    = matthewDisposable + maddyDisposable

    const matthewContribution = Number(matthew.contribution)
    const maddyContribution   = Number(maddy.contribution)
    const totalIn             = matthewContribution + maddyContribution

    // ── Joint balance for display ─────────────────────────────
    // = totalDisposable − misc (shows how much disposable is left after unplanned joint spend)
    const jointBalance = totalDisposable - miscThisMonth

    // My disposable from RPC
    const myDisposable = isMatthew ? matthewDisposable : maddyDisposable

    // ── Personal summaries (may still be loading — default to 0) ─
    const mSummary = personalSummaries.find(s => s.user_id === MATTHEW_UUID)
      ?? { var_budget: 0, var_spent: 0, misc_total: 0 }
    const dSummary = personalSummaries.find(s => s.user_id !== MATTHEW_UUID)
      ?? { var_budget: 0, var_spent: 0, misc_total: 0 }

    const ratio = settings.matthew_split_ratio

    return {
      me,
      partner,
      matthew,
      maddy,
      isMatthew,
      combinedIncome:     Number(matthew.salary) + Number(maddy.salary),
      totalAvailable,
      totalIn,             // actual contributions = planned joint costs
      fixedTotal,
      varBudget,
      miscThisMonth,
      totalDisposable,
      jointBalance,        // totalDisposable − misc
      myDisposable,
      matthewRatio:        Number(ratio),
      maddyRatio:          1 - Number(ratio),
      matthewAvailable,
      maddyAvailable,
      matthewDisposable,
      maddyDisposable,
      matthewContribution,
      maddyContribution,
      matthewSummary:      mSummary,
      maddySummary:        dSummary,
      mySummary:           isMatthew ? mSummary : dSummary,
      partnerSummary:      isMatthew ? dSummary : mSummary,
      jointFixed,
    }
  }, [loading, contribs, settings, currentProfile, jointFixed, jointCategories,
      jointMiscItems, periodStart, periodEnd, currentPeriod, personalSummaries])

  return {
    derived,
    loading,
    psLoading,
    error: cError,
    settings,
    updateProfile,
    updateSplitRatio,
    refetch: fetchContribs,
  }
}
