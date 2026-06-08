import { supabase } from '../lib/supabase'
import { broadcast } from './broadcast'

/**
 * Insert a bell notification for a user.
 * When dedupKey is provided, uses upsert with ignoreDuplicates so the same
 * alert is never created twice (safe to call on every data load).
 */
export async function createNotification({ userId, type, title, body = '', dedupKey }) {
  const row = { user_id: userId, type, title, body }

  let error
  if (dedupKey) {
    row.dedup_key = dedupKey
    ;({ error } = await supabase
      .from('app_notifications')
      .upsert(row, { onConflict: 'dedup_key', ignoreDuplicates: true }))
  } else {
    ;({ error } = await supabase.from('app_notifications').insert(row))
  }

  if (error) {
    console.warn('[createNotification] failed:', error.message)
    return
  }
  broadcast('notifications')
}
