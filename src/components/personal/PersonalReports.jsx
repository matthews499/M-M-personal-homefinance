import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { usePersonalFixed } from '../../hooks/usePersonalFixed'
import { usePersonalVariable } from '../../hooks/usePersonalVariable'
import { useDashboard } from '../../hooks/useDashboard'
import { useAuth } from '../../lib/AuthContext'
import { currency } from '../../utils/format'
import { monthParam } from '../../utils/dates'
import { t, cardStyle, surfaceStyle } from '../../utils/theme'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts'

function monthsBefore(n) {
  const months = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(d.toISOString().slice(0, 7))
  }
  return months
}

function monthLabel(ym) {
  return new Date(ym + '-02').toLocaleString('en-GB', { month: 'short', year: '2-digit' })
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl p-3 text-xs space-y-1" style={{ backgroundColor: t.card, border: `1px solid ${t.cardBorder}` }}>
      <p className="font-bold mb-2" style={{ color: t.textPrimary }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {currency(p.value)}</p>
      ))}
    </div>
  )
}

export default function PersonalReports() {
  const { session } = useAuth()
  const userId = session?.user?.id
  const month  = monthParam()

  const { derived, loading: dashLoading }         = useDashboard()
  const { items: fixedItems, loading: fixedLoad }  = usePersonalFixed()
  const { categories, loading: catLoad }            = usePersonalVariable(month)

  const [allTxns,     setAllTxns]     = useState([])
  const [allMisc,     setAllMisc]     = useState([])
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    async function load() {
      const [txRes, miscRes] = await Promise.all([
        supabase.from('personal_transactions').select('*').eq('user_id', userId).order('transaction_date'),
        supabase.from('personal_misc_expenses').select('*').eq('user_id', userId).order('expense_date'),
      ])
      setAllTxns(txRes.data ?? [])
      setAllMisc(miscRes.data ?? [])
      setDataLoading(false)
    }
    load()
  }, [userId])

  const loading = dashLoading || fixedLoad || catLoad || dataLoading

  if (loading || !derived) {
    return (
      <div className="rounded-2xl p-5" style={cardStyle}>
        <p className="text-xs" style={{ color: t.textMuted }}>Loading reportsâ€¦</p>
      </div>
    )
  }

  const { myDisposable } = derived
  const fixedTotal = fixedItems.reduce((acc, i) => acc + Number(i.amount), 0)
  const varBudget  = categories.reduce((acc, c) => acc + Number(c.monthly_budget), 0)

  const months = monthsBefore(12)

  const tableData = months.map(ym => {
    const prefix    = ym
    const txns      = allTxns.filter(tx => tx.transaction_date.startsWith(prefix))
    const misc      = allMisc.filter(m => m.expense_date.startsWith(prefix))
    const varSpent  = txns.reduce((acc, tx) => acc + Number(tx.amount), 0)
    const miscTotal = misc.reduce((acc, m) => acc + Number(m.amount), 0)
    // Personal balance = myDisposable - varSpent - miscTotal
    // (we use current myDisposable as proxy for all months)
    const balance   = myDisposable - varSpent - miscTotal
    const hasTxns   = txns.length > 0 || misc.length > 0
    return { ym, label: monthLabel(ym), myDisposable, fixedTotal, varBudget, varSpent, miscTotal, balance, hasTxns }
  })

  const chartData = tableData.slice(-6).map(d => ({
    month:        d.label,
    'Var budget': Math.round(d.varBudget),
    'Var actual': Math.round(d.varSpent),
    'Misc':       Math.round(d.miscTotal),
  }))

  const activeMonths = tableData.filter(d => d.hasTxns)

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-5" style={cardStyle}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: t.textMuted }}>Personal spending â€” last 6 months</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} barGap={4} barSize={18}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: t.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => `Â£${v}`} tick={{ fill: t.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} width={42} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Legend wrapperStyle={{ fontSize: 11, color: t.textMuted, paddingTop: 8 }} />
            <Bar dataKey="Var budget" fill="rgba(129,140,248,0.4)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Var actual" fill={t.violet} radius={[3, 3, 0, 0]} />
            <Bar dataKey="Misc"       fill={t.amber}  radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-2xl p-5" style={cardStyle}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: t.textMuted }}>Monthly breakdown</p>

        {activeMonths.length === 0 ? (
          <p className="text-sm py-2" style={{ color: t.textMuted }}>No transaction data yet.</p>
        ) : (
          <div className="space-y-3">
            {activeMonths.map(d => {
              const surplus = d.balance >= 0
              return (
                <div key={d.ym} className="rounded-xl p-4 space-y-3" style={surfaceStyle}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold" style={{ color: t.textPrimary }}>{monthLabel(d.ym)}</p>
                    <span className="text-xs px-2 py-0.5 rounded-md font-semibold" style={{ backgroundColor: surplus ? t.greenDim : t.redDim, color: surplus ? t.green : t.red }}>
                      {surplus ? `+${currency(d.balance)}` : `âˆ’${currency(Math.abs(d.balance))}`}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                    <div className="flex justify-between"><span style={{ color: t.textMuted }}>Disposable</span><span className="font-semibold tabular-nums" style={{ color: t.textPrimary }}>{currency(d.myDisposable)}</span></div>
                    <div className="flex justify-between"><span style={{ color: t.textMuted }}>Fixed costs</span><span className="font-semibold tabular-nums" style={{ color: t.red }}>âˆ’{currency(d.fixedTotal)}</span></div>
                    <div className="flex justify-between"><span style={{ color: t.textMuted }}>Var actual</span><span className="font-semibold tabular-nums" style={{ color: t.violet }}>âˆ’{currency(d.varSpent)}</span></div>
                    <div className="flex justify-between"><span style={{ color: t.textMuted }}>Miscellaneous</span><span className="font-semibold tabular-nums" style={{ color: t.amber }}>âˆ’{currency(d.miscTotal)}</span></div>
                  </div>
                  {categories.length > 0 && (
                    <div className="pt-2 space-y-1" style={{ borderTop: `1px solid ${t.divider}` }}>
                      {categories.map(cat => {
                        const spent = allTxns
                          .filter(tx => tx.category_id === cat.id && tx.transaction_date.startsWith(d.ym))
                          .reduce((acc, tx) => acc + Number(tx.amount), 0)
                        if (spent === 0) return null
                        return (
                          <div key={cat.id} className="flex justify-between text-xs">
                            <span style={{ color: t.textMuted }}>{cat.name}</span>
                            <span className="tabular-nums" style={{ color: t.textSecondary }}>{currency(spent)} / {currency(cat.monthly_budget)}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

