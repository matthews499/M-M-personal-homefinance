import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAppSettings } from './useAppSettings'
import { useJointFixed } from './useJointFixed'
import { useJointVariable } from './useJointVariable'
import { useJointMisc } from './useJointMisc'
import { useAuth } from '../lib/AuthContext'
import { calcDisposable, sumAmount } from '../utils/calculations'
import { getCurrentPeriod, getPeriodDateRange } from '../utils/payCycle'

export function useDashboard() {
  const { profile: currentProfile, session } = useAuth()
  const { settings, loading: sLoad, updateSplitRatio } = useAppSettings()
  const { items: jointFixed, loading: jfLoad } = useJointFixed()
  const { categories: jointCategories, loading: jvLoad } = useJointVariable()
  const { items: jointMiscItems, loading: miscLoad }     = useJointMisc()

  const [contribs, setContribs]   = useState([])
  const [cLoading, setCLoading]   = useState(true)
  const [cError, setCError]       = useState(null)

  const fetchContribs = useCallback(async () => {
    setCLoading(true)
    const { data, error } = await supabase.rpc('get_joint_contributions')
    if (error) setCError(error.message)
    else setContribs(data ?? [])
    setCLoading(false)
  }, [])

  useEffect(() => { fetchContribs() }, [fetchContribs])

  async function updateProfile(id, updates) {
    const { error } = await supabase.from('profiles').update(updates).eq('id', id)
    if (error) throw new Error(error.message)
    await fetchContribs()
  }

  const loading = sLoad || jfLoad || jvLoad || miscLoad || cLoading

  const currentPeriod = getCurrentPeriod()
  const { start: periodStart, end: periodEnd } = getPeriodDateRange(currentPeriod)

  const derived = useMemo(() => {
    if (loading || !contribs.length || !settings || !currentProfile) return null

    const matthew = contribs.find(c => c.name === 'Matthew')
    const maddy   = contribs.find(c => c.name === 'Maddy')
    if (!matthew || !maddy) return null

    const isMatthew     = currentProfile.id === matthew.user_id
    const me            = isMatthew ? matthew : maddy
    const partner       = isMatthew ? maddy : matthew

    const totalIn       = Number(matthew.contribution) + Number(maddy.contribution)
    const fixedTotal    = sumAmount(jointFixed)
    const varBudget     = jointCategories.reduce((acc, c) => acc + Number(c.monthly_budget), 0)
    const miscThisMonth = sumAmount(jointMiscItems.filter(i => i.expense_date >= periodStart && i.expense_date <= periodEnd))
    const jointBalance  = totalIn - fixedTotal - varBudget - miscThisMonth

    const ratio         = settings.matthew_split_ratio
    const myDisposable  = calcDisposable(jointBalance, ratio, isMatthew)

    return {
      me,
      partner,
      matthew,
      maddy,
      isMatthew,
      combinedIncome: Number(matthew.salary) + Number(maddy.salary),
      totalIn,
      fixedTotal,
      varBudget,
      miscThisMonth,
      jointBalance,
      myDisposable,
      matthewRatio: Number(ratio),
      maddyRatio: 1 - Number(ratio),
      jointFixed,
    }
  }, [loading, contribs, settings, currentProfile, jointFixed, jointCategories, jointMiscItems, periodStart, periodEnd])

  return {
    derived,
    loading,
    error: cError,
    settings,
    updateProfile,
    updateSplitRatio,
    refetch: fetchContribs,
  }
}
