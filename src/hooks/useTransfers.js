import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { broadcast, listenFor } from '../utils/broadcast'

const KEY = 'transfers'

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

  // Keep a stable ref so the realtime callback always calls the latest fetch
  // without making the realtime effect re-run on every fetch change
  const fetchRef = useRef(fetch)
  useEffect(() => { fetchRef.current = fetch }, [fetch])

  // Initial fetch + same-tab broadcast reactivity
  useEffect(() => {
    fetch()
    return listenFor(KEY, fetch)
  }, [fetch])

  // Cross-device realtime subscription — only created/destroyed when userId changes.
  // Bug fix: using `fetch` directly as a dependency caused the effect to re-run on
  // every render, attempting to add postgres_changes callbacks to an already-subscribed
  // channel and throwing "cannot add postgres_changes callbacks after subscribe()".
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`transfers-realtime-${userId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'personal_transfers' },
        () => { fetchRef.current?.(); broadcast(KEY) }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'personal_transfers' },
        () => { fetchRef.current?.(); broadcast(KEY) }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId]) // userId-only dependency — channel is stable for the whole session

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
