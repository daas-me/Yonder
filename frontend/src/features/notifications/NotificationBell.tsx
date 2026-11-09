import { useEffect, useRef, useState } from 'react'
import type { Note } from '../../shared'
import NoteList from './NoteList'

export default function NotificationBell({ notes, up, onOpenTrip, onDismiss, onDismissAll, onSettings, className = '' }: {
  notes: Note[]; up?: boolean; onOpenTrip: (id: string) => void; onDismiss: (note: Note) => void; onDismissAll: () => void; onSettings: () => void; className?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', escape) }
  }, [open])
  const urgent = notes.some(note => note.tone !== 'info')

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(value => !value)} aria-label={`Notifications${notes.length ? `, ${notes.length} new` : ''}`} aria-expanded={open} title="Notifications"
        className={`no-print relative flex h-9 w-9 items-center justify-center rounded opacity-80 transition hover:bg-current/10 hover:opacity-100 ${open ? 'bg-current/10 opacity-100' : ''} ${className}`}>
        <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={notes.length ? 'bell-ring' : ''}><path d="M6 10a6 6 0 0112 0c0 4 1.4 5.6 2 6.5H4c.6-.9 2-2.5 2-6.5z" /><path d="M10 19.5a2 2 0 004 0" /></svg>
        {notes.length > 0 && <span className={`absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none text-white ring-2 ring-sand ${urgent ? 'bg-clay' : 'bg-pine'}`}>{notes.length > 9 ? '9+' : notes.length}</span>}
      </button>
      {open && (
        <div role="dialog" aria-label="Notifications" className={`modal-surface absolute z-50 w-[22rem] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl text-ink shadow-2xl ${up ? 'bottom-full left-0 mb-2' : 'right-0 top-full mt-2'}`}>
          <div className="flex items-center justify-between border-b border-line2 px-4 py-3">
            <div className="font-display text-lg font-semibold">Notifications</div>
            {notes.length > 1 && <button type="button" className="text-xs font-semibold text-pine hover:underline" onClick={onDismissAll}>Clear all</button>}
          </div>
          <div className="max-h-[24rem] overflow-y-auto p-2">
            {notes.length
              ? <NoteList notes={notes} onOpen={note => { onOpenTrip(note.tripId); setOpen(false) }} onDismiss={onDismiss} />
              : <div className="px-4 py-8 text-center"><div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-pine/10 text-pine">✓</div><div className="text-sm font-semibold">You're all caught up</div><div className="text-xs text-ink/55">Trip countdowns, packing and budget reminders show up here.</div></div>}
          </div>
          <button type="button" onClick={() => { onSettings(); setOpen(false) }} className="w-full border-t border-line2 px-4 py-2.5 text-left text-xs font-semibold text-ink/60 hover:bg-ink/[.03] hover:text-ink">Notification settings →</button>
        </div>
      )}
    </div>
  )
}
