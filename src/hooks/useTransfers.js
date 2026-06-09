import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { broadcast, listenFor } from '../utils/broadcast'

const KEY = 'transfers'

// NOTE: Supabase Realtime is intentionally NOT used here.
//
// The previous fix (separating the channel into its own useEffect([userId]))
// still threw "cannot add postgres_changes callbacks after subscribe()" in
// React Strict Mode because removeChannel() is async — the cleanup fired but
// the channel was still registered when the next effect ran and tried to
// reuse the same channel name.
//
// Transfers are only mutated from within this same tab (sendTransfer /
// removeTransfer), and both already call broadcast(KEY) after every write.
// Cross-device realtime is not needed for a two-person same-session app.
// The broadcast pattern is sufficient and avoids this entire class of error.

export function useTransfers() {
  const { session } = useAuth()
  const userId = session?.user?.id

  const [transfers, setTransfers] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  const fetch = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('personal_transfers')
      .select('*, sender:sender_id(name), recipient:recipient_id(name)')
      .order('transfer_date', { ascending: false })
    if (error) setError(error.message)
    else setTransfers(data ?? [])
    setLoading(false)
  }, [userId])

  // Initial fetch + same-tab broadcast reactivity only.
  // No Supabase Realtime channel — see comment above.
  useEffect(() => {
    fetch()
    return listenFor(KEY, fetch)
  }, [fetch])

  function transfersForPeriod(period) {
    return transfers.filter(t => t.period === period)
  }

  function transferNetForUser(period, forUserId) {
    return transfersForPeriod(period).reduce((sum, t) => {
      if (t.recipient_id === forUserId) return sum + Number(t.amount)
      if (t.sender_id    === forUserId) return sum - Number(t.amount)
      return sum
    }, 0)
  }

  async function sendTransfer({ recipientId, amount, period, transfer_date, note }) {
    const { error } = await supabase.from('personal_transfers').insert({
      sender_id: userId, recipient_id: recipientId,
      amount: parseFloat(amount), period, transfer_date, note: note ?? '',
    })
    if (error) throw new Error(error.message)
    await fetch()
    broadcast(KEY)
  }

  async function removeTransfer(id) {
    const { error } = await supabase.from('personal_transfers').delete().eq('id', id)
    if (error) throw new Error(error.message)
    await fetch()
    broadcast(KEY)
  }

  return { transfers, loading, error, transfersForPeriod, transferNetForUser, sendTransfer, removeTransfer, refetch: fetch }
}
