import { useState } from 'react'
import { usePersonalNotebook } from '../../hooks/usePersonalNotebook'
import { t, cardStyle, inputStyle } from '../../utils/theme'
import { format, parseISO } from 'date-fns'

function SectionLabel({ children }) {
  return <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: t.textMuted }}>{children}</p>
}

function EntryModal({ entry, onSave, onCancel }) {
  const [title,   setTitle]   = useState(entry?.title ?? '')
  const [content, setContent] = useState(entry?.content ?? '')
  const [saving,  setSaving]  = useState(false)
  const [err,     setErr]     = useState(null)

  async function handleSave() {
    if (!title.trim()) { setErr('Title is required.'); return }
    setSaving(true)
    try { await onSave({ title: title.trim(), content }) }
    catch (e) { setErr(e.message); setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }} onClick={onCancel}>
      <div
        className="w-full md:max-w-lg rounded-t-3xl md:rounded-2xl p-6 pb-10 md:pb-6 space-y-4 flex flex-col"
        style={{ backgroundColor: t.card, border: `1px solid ${t.cardBorder}`, maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-2 md:hidden" style={{ backgroundColor: 'rgba(128,128,128,0.3)' }} />
        <h2 className="text-base font-bold" style={{ color: t.textPrimary }}>{entry ? 'Edit note' : 'New note'}</h2>
        <div>
          <p className="text-xs font-medium mb-1.5" style={{ color: t.textMuted }}>Title</p>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Note title…"
            autoFocus
            className="w-full px-3 py-3 rounded-xl text-base outline-none focus:ring-1 focus:ring-violet-500"
            style={inputStyle}
          />
        </div>
        <div className="flex-1 flex flex-col min-h-0">
          <p className="text-xs font-medium mb-1.5" style={{ color: t.textMuted }}>Content</p>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Write your note here…"
            className="flex-1 w-full px-3 py-3 rounded-xl text-base outline-none focus:ring-1 focus:ring-violet-500 resize-none"
            style={{ ...inputStyle, minHeight: '140px' }}
          />
        </div>
        {err && <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: t.redDim, color: t.red }}>{err}</p>}
        <div className="flex gap-2 pt-1">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl text-sm font-medium" style={{ backgroundColor: 'var(--color-pill-bg)', color: t.textSecondary }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-50" style={{ backgroundColor: t.purple, color: '#fff' }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function formatDate(iso) {
  try { return format(parseISO(iso), 'd MMM yyyy') }
  catch { return '' }
}

export default function PersonalNotebook() {
  const { entries, loading, create, update, remove } = usePersonalNotebook()
  const [adding,       setAdding]       = useState(false)
  const [editingEntry, setEditingEntry] = useState(null)
  const [expanded,     setExpanded]     = useState(null)

  async function handleCreate(fields) { await create(fields); setAdding(false) }
  async function handleUpdate(fields) { await update(editingEntry.id, fields); setEditingEntry(null) }
  async function handleDelete(id) {
    if (confirm('Delete this note?')) await remove(id)
  }

  if (loading) {
    return (
      <div className="rounded-2xl p-5" style={cardStyle}>
        <p className="text-xs" style={{ color: t.textMuted }}>Loading…</p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-2xl p-5 space-y-4" style={cardStyle}>
        <div className="flex items-center justify-between">
          <SectionLabel>Personal notebook</SectionLabel>
          <button
            onClick={() => setAdding(true)}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold"
            style={{ backgroundColor: t.purpleBg, color: t.purpleText }}
          >
            + New note
          </button>
        </div>

        {entries.length === 0 && (
          <p className="text-sm py-1" style={{ color: t.textMuted }}>No notes yet. Tap + New note to add one.</p>
        )}

        <div className="space-y-2">
          {entries.map(entry => (
            <div
              key={entry.id}
              className="rounded-xl overflow-hidden"
              style={{ backgroundColor: t.surface, border: `1px solid ${t.surfaceBorder}` }}
            >
              <button
                className="w-full flex items-center justify-between p-4 text-left"
                onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: t.textPrimary }}>{entry.title || 'Untitled'}</p>
                  <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>{formatDate(entry.updated_at)}</p>
                </div>
                <svg
                  className="w-4 h-4 shrink-0 ml-3 transition-transform"
                  style={{ color: t.textMuted, transform: expanded === entry.id ? 'rotate(180deg)' : 'none' }}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {expanded === entry.id && (
                <div style={{ borderTop: `1px solid ${t.divider}` }}>
                  {entry.content && (
                    <p className="px-4 py-3 text-sm whitespace-pre-wrap" style={{ color: t.textSecondary }}>
                      {entry.content}
                    </p>
                  )}
                  <div className="flex gap-2 px-4 pb-4">
                    <button
                      onClick={() => setEditingEntry(entry)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
                      style={{ backgroundColor: t.violetBg, color: t.violet }}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-3 1 1-3a4 4 0 01.828-1.414z" /></svg>
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
                      style={{ backgroundColor: t.redDim, color: t.red }}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {adding       && <EntryModal onSave={handleCreate} onCancel={() => setAdding(false)} />}
      {editingEntry && <EntryModal entry={editingEntry} onSave={handleUpdate} onCancel={() => setEditingEntry(null)} />}
    </>
  )
}
