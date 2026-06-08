import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { broadcast, listenFor } from '../utils/broadcast'

const KEY = 'notifications'

export function useNotifications() {
  const { session } = useAuth()
  const userId = session?.user?.id

  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data } = await supabase
      .from('app_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifications(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetch()
    return listenFor(KEY, fetch)
  }, [fetch])

  const unreadCount = notifications.filter(n => !n.read).length

  async function markAllRead() {
    if (!userId || unreadCount === 0) return
    await supabase
      .from('app_notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('read', false)
    await fetch()
    broadcast(KEY)
  }

  async function markRead(id) {
    await supabase
      .from('app_notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', id)
    await fetch()
    broadcast(KEY)
  }

  async function clearAll() {
    if (!userId) return
    await supabase.from('app_notifications').delete().eq('user_id', userId)
    await fetch()
    broadcast(KEY)
  }

  return { notifications, unreadCount, loading, markAllRead, markRead, clearAll, refetch: fetch }
}
